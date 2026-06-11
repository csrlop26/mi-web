"""Feed de mercados up/down reales de Polymarket (Fases 2 y 3).

Actualizado a la API de 2026:

- Los mercados cripto de corto plazo viven en eventos con slug DETERMINISTA:
      {asset}-updown-{dur}m-{ts}
  donde ts = inicio de la ventana en epoch UTC, alineado a la duración
  (múltiplo de 300 s para 5 min, de 900 s para 15 min). Ej. real:
  btc-updown-15m-1768502700. Eso permite calcular el slug de la ventana
  vigente sin buscar; las rutas antiguas quedan como respaldo.

- Polymarket SÍ publica el precio de apertura ("price to beat", el strike
  contra el que resuelve el oráculo de Chainlink) vía
      https://polymarket.com/api/crypto/price-to-beat?slug={slug}
  El feed lo adjunta a la cotización; si no llega, la estrategia recurre a
  capturarlo de Binance (menos exacto: la resolución es contra Chainlink).

- La resolución se consulta sin bloquear el bucle (antes un sleep de 5 s
  por ventana congelaba el descubrimiento y se perdía el inicio fresco de
  las ventanas de 5 min).
"""
from __future__ import annotations

import asyncio
import json as _json
import logging
import time

from ..events import PredictionQuote, WindowResolution

log = logging.getLogger("polymarket")

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"
PTB_URLS = (  # price-to-beat: prueba la ruta cripto y la genérica
    "https://polymarket.com/api/crypto/price-to-beat?slug={slug}",
    "https://polymarket.com/api/equity/price-to-beat/{slug}",
)
DISCOVERY_BACKOFF = 10.0   # con ventanas de 5 min no podemos esperar 30 s
RESOLVE_RETRY = 5.0        # segundos entre intentos de leer la resolución
RESOLVE_MAX_TRIES = 12     # ~60 s de margen para que el oráculo publique

SLUG_PREFIX = {"BTC": "btc", "ETH": "eth", "SOL": "sol", "XRP": "xrp"}
SEARCH_NAME = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
               "XRP": "xrp"}
LEGACY_SERIES_SLUG = {  # respaldo por si cambia el formato determinista
    15: {"BTC": "btc-up-or-down-15m",
         "ETH": "eth-up-or-down-15m",
         "SOL": "sol-up-or-down-15m"},
    5:  {"BTC": "btc-up-or-down-5m",
         "ETH": "eth-up-or-down-5m",
         "SOL": "sol-up-or-down-5m"},
}


class PolymarketFeed:
    def __init__(self, symbols: list[str], durations_minutes: list[int]):
        self.symbols = [s for s in symbols if s in SLUG_PREFIX]
        self.durations = sorted({int(d) for d in durations_minutes})
        if not self.symbols:
            raise SystemExit(f"Polymarket: ningún símbolo soportado en {symbols}")
        if not self.durations:
            raise SystemExit("Polymarket: durations_minutes vacío")

    async def events(self):
        try:
            import aiohttp
        except ImportError as exc:
            raise SystemExit(
                "Modo paper/live: instala dependencias → pip install -r requirements.txt"
            ) from exc

        async with aiohttp.ClientSession(
                headers={"User-Agent": "Mozilla/5.0 (polyedge-bot/2.0)"}) as http:
            active: dict[tuple, dict | None] = {}   # (symbol, dur) -> mercado
            next_discovery: dict[tuple, float] = {}
            pending: list[dict] = []                # ventanas esperando resolución
            while True:
                now = time.time()

                # 1) resoluciones pendientes, sin bloquear el bucle
                still = []
                for m in pending:
                    if now < m["try_after"]:
                        still.append(m)
                        continue
                    res = await self._resolve(http, m)
                    if res is not None:
                        yield res
                    elif m["tries"] < RESOLVE_MAX_TRIES:
                        m["tries"] += 1
                        m["try_after"] = now + RESOLVE_RETRY
                        still.append(m)
                    else:
                        log.warning("%s: ventana '%s' expiró sin resultado "
                                    "publicado", m["symbol"], m["question"])
                pending = still

                # 2) descubrimiento + cotizaciones
                for symbol in self.symbols:
                    for dur in self.durations:
                        key = (symbol, dur)
                        market = active.get(key)
                        if market is not None and now >= market["end_ts"]:
                            market["tries"] = 0
                            market["try_after"] = now + 4.0
                            pending.append(market)
                            market = None
                            active[key] = None
                        if market is None:
                            if now < next_discovery.get(key, 0.0):
                                continue
                            market = await self._discover(http, symbol, dur)
                            active[key] = market
                            if market is None:
                                next_discovery[key] = now + DISCOVERY_BACKOFF
                                continue
                        quote = await self._quote(http, market, now)
                        if quote is not None:
                            yield quote
                await asyncio.sleep(1.0)

    # ------------------------------------------------------------ descubrimiento

    async def _discover(self, http, symbol: str, dur: int) -> dict | None:
        """Ventana vigente. Primero slug determinista; luego rutas legacy."""
        markets = await self._via_deterministic_slug(http, symbol, dur)
        if not markets:
            markets = (await self._via_series_slug(http, symbol, dur)
                       or await self._via_market_listing(http, symbol, dur)
                       or await self._via_search(http, symbol, dur))
        if not markets:
            log.warning("%s %dm: sin mercado up/down activo (reintento en %.0f s)",
                        symbol, dur, DISCOVERY_BACKOFF)
            return None
        markets.sort(key=lambda m: m["end_ts"])
        m = markets[0]
        log.info("%s %dm: mercado activo '%s' (cierra en %.0f s)",
                 symbol, dur, m["question"], m["end_ts"] - time.time())
        return m

    async def _via_deterministic_slug(self, http, symbol: str, dur: int) -> list[dict]:
        """Slug calculado: {asset}-updown-{dur}m-{epoch alineado}.

        Prueba la ventana vigente y la siguiente (al filo del cambio, la
        vigente puede estar a segundos de expirar).
        """
        period = dur * 60
        aligned = int(time.time() // period) * period
        out: list[dict] = []
        for ts in (aligned, aligned + period):
            slug = f"{SLUG_PREFIX[symbol]}-updown-{dur}m-{ts}"
            data = await self._get(http, f"{GAMMA_API}/events",
                                   {"slug": slug, "limit": "5"})
            if not data:
                one = await self._get(http, f"{GAMMA_API}/events/slug/{slug}", {})
                data = [one] if isinstance(one, dict) else None
            for ev in data or []:
                out += self._parse_markets(symbol, dur, ev.get("markets", []),
                                           slug=ev.get("slug") or slug)
            if out:
                break
        return out

    async def _via_series_slug(self, http, symbol: str, dur: int) -> list[dict]:
        slug = LEGACY_SERIES_SLUG.get(dur, {}).get(symbol)
        if not slug:
            return []
        data = await self._get(http, f"{GAMMA_API}/events",
                               {"slug": slug, "closed": "false", "limit": "10"})
        out = []
        for ev in data or []:
            out += self._parse_markets(symbol, dur, ev.get("markets", []))
        return out

    async def _via_market_listing(self, http, symbol: str, dur: int) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"closed": "false", "order": "endDate",
                                "ascending": "true", "limit": "200"})
        name = SEARCH_NAME[symbol]
        candidates = [m for m in data or []
                      if name in (m.get("question") or "").lower()
                      and "up or down" in (m.get("question") or "").lower()]
        return self._parse_markets(symbol, dur, candidates)

    async def _via_search(self, http, symbol: str, dur: int) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/public-search",
                               {"q": f"{SEARCH_NAME[symbol]} up or down",
                                "limit_per_type": "10"})
        events = (data or {}).get("events", []) if isinstance(data, dict) else []
        out = []
        for ev in events:
            out += self._parse_markets(symbol, dur, ev.get("markets", []))
        return out

    def _parse_markets(self, symbol: str, dur: int, raw_markets: list,
                       slug: str | None = None) -> list[dict]:
        """Filtra mercados con tokens y cierre futuro y los normaliza."""
        now = time.time()
        out = []
        for m in raw_markets:
            end = m.get("endDateIso") or m.get("endDate")
            token_ids = m.get("clobTokenIds")
            if not end or not token_ids:
                continue
            tokens = (_json.loads(token_ids)
                      if isinstance(token_ids, str) else token_ids)
            if not tokens:
                continue
            end_ts = _parse_iso(end)
            if not end_ts or end_ts <= now:
                continue
            # Solo la duración pedida: la ventana vigente expira como mucho
            # en `dur` minutos (más un margen).
            if end_ts - now > dur * 60 * 1.5:
                continue
            out.append({
                "symbol": symbol,
                "window_id": m.get("conditionId") or str(m.get("id", "?")),
                "question": m.get("question", "?"),
                "slug": m.get("slug") or slug,
                "up_token": tokens[0],   # primer token = "Up"
                "end_ts": end_ts,
                "window_seconds": dur * 60.0,
                "condition_id": m.get("conditionId"),
                "open_price": 0.0,       # se rellena vía price-to-beat
                "ptb_next_try": 0.0,
            })
        return out

    async def _get(self, http, url: str, params: dict | None = None):
        try:
            async with http.get(url, params=params or {}, timeout=10) as r:
                if r.status != 200:
                    log.debug("GET %s -> HTTP %d", url, r.status)
                    return None
                return await r.json(content_type=None)
        except Exception as exc:
            log.debug("GET %s falló: %s", url, exc)
            return None

    # ----------------------------------------------------------------- mercado

    async def _price_to_beat(self, http, market: dict) -> None:
        """Strike oficial de la ventana (resuelve contra Chainlink)."""
        slug = market.get("slug")
        if not slug:
            return
        for tmpl in PTB_URLS:
            data = await self._get(http, tmpl.format(slug=slug))
            price = _extract_price(data)
            if price and price > 0:
                market["open_price"] = price
                log.info("%s: price-to-beat %.2f (%s)",
                         market["symbol"], price, slug)
                return

    async def _quote(self, http, market: dict, now: float) -> PredictionQuote | None:
        if market["open_price"] <= 0 and now >= market["ptb_next_try"]:
            market["ptb_next_try"] = now + 10.0
            await self._price_to_beat(http, market)

        book = await self._get(http, f"{CLOB_API}/book",
                               {"token_id": market["up_token"]})
        bids = (book or {}).get("bids") or []
        asks = (book or {}).get("asks") or []
        if not bids or not asks:
            return None
        best_bid = max(float(b["price"]) for b in bids)
        best_ask = min(float(a["price"]) for a in asks)
        if best_bid <= 0 or best_ask >= 1 or best_bid >= best_ask:
            return None
        return PredictionQuote(
            symbol=market["symbol"], window_id=market["window_id"],
            open_price=market["open_price"],
            up_bid=best_bid, up_ask=best_ask,
            seconds_remaining=max(market["end_ts"] - now, 0.0),
            window_seconds=market["window_seconds"], ts=now,
        )

    async def _resolve(self, http, market: dict) -> WindowResolution | None:
        """Resultado oficial; el llamante gestiona reintentos sin bloquear."""
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"condition_ids": market["condition_id"]})
        for m in data or []:
            prices = m.get("outcomePrices")
            if prices:
                p = _json.loads(prices) if isinstance(prices, str) else prices
                up = float(p[0])
                if up not in (0.0, 1.0) and not m.get("closed"):
                    continue  # aún sin resolver de verdad
                return WindowResolution(
                    symbol=market["symbol"], window_id=market["window_id"],
                    up_won=up > 0.5, close_price=0.0, ts=time.time(),
                )
        return None


def _extract_price(data) -> float | None:
    """El price-to-beat llega como número suelto o envuelto en JSON."""
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
        for k in ("price", "priceToBeat", "price_to_beat", "openPrice",
                  "open_price", "value", "strike"):
            if k in data:
                return _extract_price(data[k])
    return None


def _parse_iso(s: str) -> float | None:
    from datetime import datetime
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None
