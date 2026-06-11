"""Feed de mercados up/down reales de Polymarket (Fases 2 y 3).

Actualizado a la API de 2026. Diagnóstico detallado en logs:
  POLY-OK   BTC/5m  → mercado encontrado y cotizando
  POLY-NEXT BTC/5m  → ventana encontrada pero aún no empieza
  POLY-PAGE BTC/5m  → slug extraído de la web polymarket.com
  POLY-WAIT BTC/5m  → en backoff tras no encontrar mercado
  POLY-BOOK BTC/5m  → libro bid/ask recibido
  POLY-HTTP …       → error HTTP concreto (403 = bloqueo de IP)

Cadena de descubrimiento (en orden):
  1. slug determinista  {asset}-updown-{dur}m-{epoch alineado}
  2. scraping de polymarket.com/crypto/{dur}M  (el slug actual SIEMPRE
     está en esa página aunque el listado general de la API no lo dé)
  3. slug de serie legacy
  4. listado general de /markets
  5. búsqueda pública
"""
from __future__ import annotations

import asyncio
import json as _json
import logging
import re
import time

from ..events import PredictionQuote, WindowResolution

log = logging.getLogger("polymarket")

GAMMA_API   = "https://gamma-api.polymarket.com"
CLOB_API    = "https://clob.polymarket.com"
PTB_URLS = (
    "https://polymarket.com/api/crypto/price-to-beat?slug={slug}",
    "https://polymarket.com/api/equity/price-to-beat/{slug}",
)
DISCOVERY_BACKOFF = 10.0
RESOLVE_RETRY     = 5.0
RESOLVE_MAX_TRIES = 12
PAGE_CACHE_TTL    = 30.0   # html de polymarket.com compartido entre símbolos
MAX_LEAD_SECS     = 1200.0 # aceptar ventanas que empiezan en < 20 min

# UA de navegador real: la API Gamma y polymarket.com pasan por Cloudflare
# y un UA de bot puede devolver 403 intermitente.
BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
PAGE_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SLUG_PREFIX  = {"BTC": "btc", "ETH": "eth", "SOL": "sol", "XRP": "xrp"}
SEARCH_NAME  = {"BTC": "bitcoin", "ETH": "ethereum",
                "SOL": "solana",  "XRP": "xrp"}
LEGACY_SERIES = {
    15: {"BTC": "btc-up-or-down-15m", "ETH": "eth-up-or-down-15m",
         "SOL": "sol-up-or-down-15m"},
    5:  {"BTC": "btc-up-or-down-5m",  "ETH": "eth-up-or-down-5m",
         "SOL": "sol-up-or-down-5m"},
}
# Palabras clave de duración para filtrar el texto del mercado
DUR_KEYWORDS = {5: ["5m", "5-min", "5 min"], 15: ["15m", "15-min", "15 min"]}


class PolymarketFeed:
    def __init__(self, symbols: list[str], durations_minutes: list[int]):
        self.symbols   = [s for s in symbols if s in SLUG_PREFIX]
        self.durations = sorted({int(d) for d in durations_minutes})
        if not self.symbols:
            raise SystemExit(f"Polymarket: ningún símbolo soportado en {symbols}")
        self._page_cache: dict[int, tuple[float, str | None]] = {}
        self._last_403_log = 0.0
        self._last_page_warn = 0.0

    async def events(self):
        try:
            import aiohttp
        except ImportError as exc:
            raise SystemExit(
                "Modo paper/live: pip install -r requirements.txt"
            ) from exc

        async with aiohttp.ClientSession(
                headers={"User-Agent": BROWSER_UA}) as http:
            active: dict[tuple, dict | None] = {}
            next_discovery: dict[tuple, float] = {}
            pending: list[dict] = []
            while True:
                now = time.time()

                # resoluciones pendientes (sin bloquear el bucle principal)
                still = []
                for m in pending:
                    if now < m["try_after"]:
                        still.append(m); continue
                    res = await self._resolve(http, m)
                    if res is not None:
                        yield res
                    elif m["tries"] < RESOLVE_MAX_TRIES:
                        m["tries"]    += 1
                        m["try_after"] = now + RESOLVE_RETRY
                        still.append(m)
                    else:
                        log.warning("POLY-NORES %s/%s: sin resultado tras %.0f s",
                                    m["symbol"], m.get("question","?")[:30],
                                    RESOLVE_MAX_TRIES * RESOLVE_RETRY)
                pending = still

                # descubrimiento + cotizaciones
                # Máx. 1 descubrimiento por ciclo: una ráfaga de ~100
                # peticiones (6 mercados a la vez) dispara el rate limit
                # de Cloudflare y la API empieza a devolver 429.
                discovered_this_cycle = False
                for symbol in self.symbols:
                    for dur in self.durations:
                        key = (symbol, dur)
                        market = active.get(key)
                        if market is not None and now >= market["end_ts"]:
                            market["tries"]    = 0
                            market["try_after"] = now + 4.0
                            pending.append(market)
                            active[key] = market = None
                        if market is None:
                            if (discovered_this_cycle
                                    or now < next_discovery.get(key, 0.0)):
                                continue
                            discovered_this_cycle = True
                            market = await self._discover(http, symbol, dur)
                            active[key] = market
                            if market is None:
                                next_discovery[key] = now + DISCOVERY_BACKOFF
                                continue
                        quote = await self._quote(http, market, now)
                        if quote is not None:
                            yield quote
                await asyncio.sleep(1.0)

    # ─────────────────────────────────────────────── descubrimiento

    async def _discover(self, http, symbol: str, dur: int) -> dict | None:
        markets = (
            await self._via_deterministic_slug(http, symbol, dur)
            or await self._via_web_page(http, symbol, dur)
            or await self._via_series_slug(http, symbol, dur)
            or await self._via_market_listing(http, symbol, dur)
            or await self._via_search(http, symbol, dur)
        )
        if not markets:
            log.warning("POLY-WAIT %s/%dm: sin mercado activo "
                        "(reintento en %.0fs)",
                        symbol, dur, DISCOVERY_BACKOFF)
            return None
        now = time.time()
        # Preferir la ventana EN CURSO; si no hay, la próxima más cercana.
        markets.sort(key=lambda m: (m["start_ts"] > now, m["end_ts"]))
        m = markets[0]
        if m["start_ts"] > now:
            log.info("POLY-NEXT %s/%dm: '%s' empieza en %.0fs (en espera)",
                     symbol, dur, m["question"][:50], m["start_ts"] - now)
        else:
            log.info("POLY-OK %s/%dm: '%s' (cierra en %.0fs | token %s…)",
                     symbol, dur, m["question"][:50], m["end_ts"] - now,
                     m["up_token"][:12])
        return m

    async def _via_deterministic_slug(self, http, symbol: str,
                                       dur: int) -> list[dict]:
        """Slug determinista: {asset}-updown-{dur}m-{epoch alineado}."""
        period  = dur * 60
        aligned = int(time.time() // period) * period
        out: list[dict] = []
        tried: list[str] = []
        for ts in (aligned, aligned + period, aligned - period):
            slug = f"{SLUG_PREFIX[symbol]}-updown-{dur}m-{ts}"
            tried.append(slug)
            out = await self._markets_for_slug(http, symbol, dur, slug)
            if out:
                log.info("POLY-SLUG %s/%dm: encontrado vía %s",
                         symbol, dur, slug)
                break
        if not out:
            log.info("POLY-SLUG %s/%dm: sin resultado para %s (±1 ventana)",
                     symbol, dur, tried[0])
        return out

    async def _via_web_page(self, http, symbol: str, dur: int) -> list[dict]:
        """Extrae el slug actual del HTML de polymarket.com/crypto/{dur}M.

        El listado general de la API Gamma NO incluye las ventanas activas
        de 5/15 min, pero la página web siempre embebe el slug del mercado
        en curso. Es la fuente de verdad cuando el slug determinista falla
        (p. ej. si Polymarket cambia la alineación de los epochs).
        """
        html = await self._page_html(http, dur)
        if not html:
            return []
        pattern = rf"{SLUG_PREFIX[symbol]}-updown-{dur}m-(\d+)"
        epochs = sorted({int(e) for e in re.findall(pattern, html)})
        if not epochs:
            self._page_warn("POLY-PAGE %s/%dm: HTML recibido pero sin slugs "
                            "dentro (¿challenge de Cloudflare?)", symbol, dur)
            return []
        now = time.time()
        period = dur * 60
        live     = [e for e in epochs if e <= now < e + period]
        upcoming = [e for e in epochs if e > now]
        for ts in (live + upcoming)[:3] or epochs[-1:]:
            slug = f"{SLUG_PREFIX[symbol]}-updown-{dur}m-{ts}"
            out = await self._markets_for_slug(http, symbol, dur, slug)
            if out:
                log.info("POLY-PAGE %s/%dm: slug %s extraído de la web",
                         symbol, dur, slug)
                return out
        return []

    async def _page_html(self, http, dur: int) -> str | None:
        """HTML de la página de cripto, cacheado y compartido entre símbolos."""
        cached = self._page_cache.get(dur)
        now = time.time()
        if cached and now - cached[0] < PAGE_CACHE_TTL:
            return cached[1]
        url = f"https://polymarket.com/crypto/{dur}M"
        html: str | None = None
        try:
            async with http.get(url, timeout=15, headers=PAGE_HEADERS) as r:
                if r.status == 200:
                    html = await r.text()
                else:
                    self._page_warn("POLY-PAGE %s → HTTP %d (scraping web "
                                    "no disponible)", url, r.status)
        except Exception as exc:
            self._page_warn("POLY-PAGE err %s: %s", url, exc)
        # cachear también los fallos: evita reintentar 6 veces por ciclo
        self._page_cache[dur] = (now, html)
        return html

    def _page_warn(self, fmt: str, *args) -> None:
        now = time.time()
        if now - self._last_page_warn >= 60.0:
            self._last_page_warn = now
            log.warning(fmt, *args)
        else:
            log.debug(fmt, *args)

    async def _markets_for_slug(self, http, symbol: str, dur: int,
                                 slug: str) -> list[dict]:
        # Intento 1: GET /events?slug=
        data = await self._get(http, f"{GAMMA_API}/events",
                               {"slug": slug, "limit": "5"})
        if isinstance(data, list) and not data:
            # 200 con lista vacía: el slug NO existe → no insistir con
            # rutas alternativas (ahorra peticiones = evita rate limit).
            return []
        if data is None:
            # Error HTTP/red → probar la ruta de mercados directa
            mkts = await self._get(http, f"{GAMMA_API}/markets",
                                   {"slug": slug, "limit": "5"})
            if mkts:
                return self._parse_markets(symbol, dur, mkts, slug=slug)
        out: list[dict] = []
        n_mkts = 0
        for ev in data or []:
            mlist = ev.get("markets", [])
            n_mkts += len(mlist)
            out += self._parse_markets(symbol, dur, mlist,
                                       slug=ev.get("slug") or slug)
        if data and n_mkts and not out:
            # El evento existe pero el filtro tiró todos sus mercados:
            # esto delataría un bug de parseo, hay que verlo en el log.
            log.info("POLY-SLUG %s/%dm: evento %s existe (%d mercados) "
                     "pero 0 pasan el filtro", symbol, dur, slug, n_mkts)
        return out

    async def _via_series_slug(self, http, symbol: str,
                                dur: int) -> list[dict]:
        slug = LEGACY_SERIES.get(dur, {}).get(symbol)
        if not slug:
            return []
        data = await self._get(http, f"{GAMMA_API}/events",
                               {"slug": slug, "closed": "false", "limit": "10"})
        out = []
        for ev in data or []:
            out += self._parse_markets(symbol, dur, ev.get("markets", []))
        if out:
            log.debug("POLY-SLUG %s/%dm: encontrado vía serie '%s'",
                      symbol, dur, slug)
        return out

    async def _via_market_listing(self, http, symbol: str,
                                   dur: int) -> list[dict]:
        # Sin tag=crypto — ese parámetro filtra demasiado en la API 2026
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"closed": "false", "order": "endDate",
                                "ascending": "true", "limit": "200"})
        name = SEARCH_NAME[symbol]
        candidates = []
        for m in data or []:
            q = (m.get("question") or "").lower()
            s = (m.get("slug") or "").lower()
            if name not in q and SLUG_PREFIX[symbol] + "-" not in s:
                continue
            if ("up or down" not in q and "updown" not in q
                    and "updown" not in s):
                continue
            candidates.append(m)
        out = self._parse_markets(symbol, dur, candidates)
        if candidates:
            log.info("POLY-LIST %s/%dm: %d candidatos → %d válidos",
                     symbol, dur, len(candidates), len(out))
        return out

    async def _via_search(self, http, symbol: str, dur: int) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/public-search",
                               {"q": f"{SEARCH_NAME[symbol]} up or down",
                                "limit_per_type": "10"})
        events = (data or {}).get("events", []) if isinstance(data, dict) else []
        out = []
        for ev in events:
            out += self._parse_markets(symbol, dur, ev.get("markets", []))
        return out

    def _parse_markets(self, symbol: str, dur: int, raw: list,
                       slug: str | None = None) -> list[dict]:
        now = time.time()
        period = dur * 60.0
        out = []
        rejected_times: list[float] = []
        for m in raw:
            # endDate PRIMERO: es el timestamp completo. endDateIso es solo
            # la FECHA ("2026-06-11") → parsearlo da medianoche y todos los
            # mercados intradía parecen expirados. Este orden invertido tuvo
            # al bot ciego desde el día 1.
            end = m.get("endDate") or m.get("endDateIso")
            token_ids = m.get("clobTokenIds")
            if not end or not token_ids:
                continue
            # La API 2026 expone acceptingOrders; False = mercado parado.
            if m.get("acceptingOrders") is False or m.get("closed") is True:
                continue
            tokens = (_json.loads(token_ids)
                      if isinstance(token_ids, str) else token_ids)
            if not tokens:
                continue
            end_ts = _parse_iso(end)
            if not end_ts or end_ts <= now:
                continue
            start_ts = end_ts - period
            # Aceptar la ventana en curso o la próxima (< 20 min de espera).
            # Descartar ventanas lejanas y mercados largos (diarios, etc.).
            if start_ts - now > MAX_LEAD_SECS or end_ts - now > 7200:
                rejected_times.append(end_ts - now)
                continue
            out.append({
                "symbol":         symbol,
                "window_id":      m.get("conditionId") or str(m.get("id", "?")),
                "question":       m.get("question", "?"),
                "slug":           m.get("slug") or slug,
                "up_token":       tokens[_up_index(m, tokens)],
                "start_ts":       start_ts,
                "end_ts":         end_ts,
                "window_seconds": period,
                "condition_id":   m.get("conditionId"),
                "open_price":     0.0,
                "ptb_next_try":   0.0,
            })
        if rejected_times:
            mins = [f"{t/60:.0f}m" for t in sorted(rejected_times)]
            log.info("POLY-REJECT %s/%dm: %d descartados por tiempo: %s",
                     symbol, dur, len(rejected_times), " ".join(mins))
        return out

    # ─────────────────────────────────────────────── HTTP helper

    async def _get(self, http, url: str, params: dict | None = None):
        """None = error HTTP/red.  [] o {} = respuesta 200 vacía.

        `_t` rompe la caché de Cloudflare: una misma URL puede quedar
        cacheada con respuesta vacía (p. ej. tras una ráfaga con rate
        limit) y devolver vacío para siempre aunque el dato exista.
        """
        path = url.split("polymarket.com")[-1]
        p = dict(params or {})
        p["_t"] = str(int(time.time() * 1000))
        try:
            async with http.get(url, params=p, timeout=12,
                                headers={"Cache-Control": "no-cache"}) as r:
                if r.status == 200:
                    return await r.json(content_type=None)
                self._http_warn(r.status, path)
                return None
        except asyncio.TimeoutError:
            self._http_warn(0, f"timeout {path}")
            return None
        except Exception as exc:
            self._http_warn(0, f"{path}: {exc}")
            return None

    def _http_warn(self, status: int, detail: str) -> None:
        """Cualquier fallo HTTP visible en el log (máx. 1 warning/30 s)."""
        now = time.time()
        if now - self._last_403_log < 30.0:
            log.debug("POLY-HTTP %d %s", status, detail)
            return
        self._last_403_log = now
        if status == 403:
            log.warning("POLY-HTTP 403 en %s — Polymarket bloquea esta IP "
                        "(geobloqueo/VPN). Prueba polymarket.com en el "
                        "navegador.", detail)
        elif status == 429:
            log.warning("POLY-HTTP 429 en %s — rate limit de Cloudflare; "
                        "el bot reduce el ritmo automáticamente.", detail)
        elif status:
            log.warning("POLY-HTTP %d en %s", status, detail)
        else:
            log.warning("POLY-HTTP error de red: %s", detail)

    # ─────────────────────────────────────────────── cotización

    async def _price_to_beat(self, http, market: dict) -> None:
        slug = market.get("slug")
        if not slug:
            return
        for tmpl in PTB_URLS:
            data = await self._get(http, tmpl.format(slug=slug))
            price = _extract_price(data)
            if price and price > 0:
                market["open_price"] = price
                log.debug("POLY-PTB %s: strike=%.2f", market["symbol"], price)
                return

    async def _quote(self, http, market: dict, now: float) -> PredictionQuote | None:
        if now < market["start_ts"]:
            # Ventana aún no abierta: avisar cada 30 s y no pedir libro.
            if now - market.get("_last_next_log", 0) >= 30.0:
                market["_last_next_log"] = now
                log.info("POLY-NEXT %s/%dm: ventana empieza en %.0fs",
                         market["symbol"],
                         int(market["window_seconds"] // 60),
                         market["start_ts"] - now)
            return None

        if market["open_price"] <= 0 and now >= market["ptb_next_try"]:
            market["ptb_next_try"] = now + 10.0
            await self._price_to_beat(http, market)

        book = await self._get(http, f"{CLOB_API}/book",
                               {"token_id": market["up_token"]})
        bids = (book or {}).get("bids") or []
        asks = (book or {}).get("asks") or []
        if not bids or not asks:
            log.debug("POLY-BOOK %s/%dm: libro vacío (bids=%d asks=%d)",
                      market["symbol"],
                      int(market["window_seconds"] // 60),
                      len(bids), len(asks))
            return None
        best_bid = max(float(b["price"]) for b in bids)
        best_ask = min(float(a["price"]) for a in asks)
        if best_bid <= 0 or best_ask >= 1 or best_bid >= best_ask:
            return None
        # Log cada 30 s para ver que llegan precios
        if now - market.get("_last_book_log", 0) >= 30.0:
            market["_last_book_log"] = now
            secs = market["end_ts"] - now
            log.info("POLY-BOOK %s/%dm bid=%.3f ask=%.3f spread=%.3f "
                     "quedan=%.0fs strike=%.2f",
                     market["symbol"],
                     int(market["window_seconds"] // 60),
                     best_bid, best_ask, best_ask - best_bid,
                     secs, market["open_price"])
        return PredictionQuote(
            symbol=market["symbol"],
            window_id=market["window_id"],
            open_price=market["open_price"],
            up_bid=best_bid, up_ask=best_ask,
            seconds_remaining=max(market["end_ts"] - now, 0.0),
            window_seconds=market["window_seconds"], ts=now,
        )

    async def _resolve(self, http, market: dict) -> WindowResolution | None:
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"condition_ids": market["condition_id"]})
        for m in data or []:
            prices = m.get("outcomePrices")
            if prices:
                p = _json.loads(prices) if isinstance(prices, str) else prices
                up = float(p[0])
                if up not in (0.0, 1.0) and not m.get("closed"):
                    continue
                return WindowResolution(
                    symbol=market["symbol"],
                    window_id=market["window_id"],
                    up_won=up > 0.5,
                    close_price=0.0,
                    ts=time.time(),
                )
        return None


def _up_index(m: dict, tokens: list) -> int:
    """Índice del token UP. Polymarket lista outcomes ['Up','Down'] casi
    siempre, pero si vinieran invertidos esto evita comprar el lado erróneo."""
    outcomes = m.get("outcomes")
    if isinstance(outcomes, str):
        try:
            outcomes = _json.loads(outcomes)
        except (ValueError, TypeError):
            outcomes = None
    if outcomes and len(outcomes) == len(tokens):
        for i, o in enumerate(outcomes):
            if str(o).strip().lower().startswith(("up", "yes")):
                return i
    return 0


def _extract_price(data) -> float | None:
    if data is None:
        return None
    if isinstance(data, (int, float)):
        return float(data)
    if isinstance(data, str):
        try:
            return float(data)
        except ValueError:
            return None
    if isinstance(data, dict):
        for k in ("price", "priceToBeat", "price_to_beat",
                  "openPrice", "open_price", "value", "strike"):
            if k in data:
                return _extract_price(data[k])
    return None


def _parse_iso(s: str) -> float | None:
    from datetime import datetime, timezone
    if "T" not in s:
        return None  # solo fecha, sin hora: inútil para ventanas de minutos
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)  # la API trabaja en UTC
        return dt.timestamp()
    except ValueError:
        return None
