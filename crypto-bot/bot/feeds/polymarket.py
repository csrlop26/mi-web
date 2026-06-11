"""Feed de mercados up/down reales de Polymarket (Fases 2 y 3).

Actualizado a la API de 2026. Diagnóstico detallado en logs:
  POLY-OK   BTC/5m  → mercado encontrado y cotizando
  POLY-WAIT BTC/5m  → en backoff tras no encontrar mercado
  POLY-ERR  BTC/5m  → error HTTP concreto al buscar
  POLY-BOOK BTC/5m  → libro bid/ask recibido
"""
from __future__ import annotations

import asyncio
import json as _json
import logging
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

    async def events(self):
        try:
            import aiohttp
        except ImportError as exc:
            raise SystemExit(
                "Modo paper/live: pip install -r requirements.txt"
            ) from exc

        async with aiohttp.ClientSession(
                headers={"User-Agent": "Mozilla/5.0 (polyedge-bot/2.0)"}) as http:
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

    # ─────────────────────────────────────────────── descubrimiento

    async def _discover(self, http, symbol: str, dur: int) -> dict | None:
        markets = (
            await self._via_deterministic_slug(http, symbol, dur)
            or await self._via_series_slug(http, symbol, dur)
            or await self._via_market_listing(http, symbol, dur)
            or await self._via_search(http, symbol, dur)
        )
        if not markets:
            log.warning("POLY-WAIT %s/%dm: sin mercado activo "
                        "(reintento en %.0fs)",
                        symbol, dur, DISCOVERY_BACKOFF)
            return None
        markets.sort(key=lambda m: m["end_ts"])
        m = markets[0]
        secs = m["end_ts"] - time.time()
        log.info("POLY-OK %s/%dm: '%s' (cierra en %.0fs | token %s…)",
                 symbol, dur, m["question"][:50], secs,
                 m["up_token"][:12])
        return m

    async def _via_deterministic_slug(self, http, symbol: str,
                                       dur: int) -> list[dict]:
        """Slug determinista: {asset}-updown-{dur}m-{epoch alineado}."""
        period  = dur * 60
        aligned = int(time.time() // period) * period
        out: list[dict] = []
        for ts in (aligned, aligned - period, aligned + period):
            slug = f"{SLUG_PREFIX[symbol]}-updown-{dur}m-{ts}"
            # Intento 1: GET /events?slug=
            data = await self._get(http, f"{GAMMA_API}/events",
                                   {"slug": slug, "limit": "5"})
            if not data:
                # Intento 2: GET /events/slug/{slug}
                one = await self._get(http, f"{GAMMA_API}/events/slug/{slug}")
                data = [one] if isinstance(one, dict) else None
            for ev in data or []:
                out += self._parse_markets(symbol, dur,
                                           ev.get("markets", []),
                                           slug=ev.get("slug") or slug)
            if out:
                log.debug("POLY-SLUG %s/%dm: encontrado vía slug %s",
                          symbol, dur, slug)
                break
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
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"closed": "false", "order": "endDate",
                                "ascending": "true", "limit": "200",
                                "tag": "crypto"})
        name = SEARCH_NAME[symbol]
        dur_kw = DUR_KEYWORDS.get(dur, [])
        candidates = []
        for m in data or []:
            q = (m.get("question") or "").lower()
            if name not in q:
                continue
            if "up or down" not in q and "updown" not in q:
                continue
            # Filtro de duración opcional (puede no aparecer en el título)
            if dur_kw and not any(kw in q for kw in dur_kw):
                # No hay kw de duración: incluir si la ventana temporal encaja
                pass
            candidates.append(m)
        out = self._parse_markets(symbol, dur, candidates)
        if out:
            log.debug("POLY-LIST %s/%dm: %d candidatos → %d válidos",
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
        out = []
        for m in raw:
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
            if end_ts - now > dur * 60 * 1.6:
                continue
            out.append({
                "symbol":         symbol,
                "window_id":      m.get("conditionId") or str(m.get("id", "?")),
                "question":       m.get("question", "?"),
                "slug":           m.get("slug") or slug,
                "up_token":       tokens[0],
                "end_ts":         end_ts,
                "window_seconds": dur * 60.0,
                "condition_id":   m.get("conditionId"),
                "open_price":     0.0,
                "ptb_next_try":   0.0,
            })
        return out

    # ─────────────────────────────────────────────── HTTP helper

    async def _get(self, http, url: str, params: dict | None = None):
        try:
            async with http.get(url, params=params or {},
                                timeout=12) as r:
                if r.status == 200:
                    return await r.json(content_type=None)
                log.debug("POLY-HTTP %s → %d", url.split("polymarket.com")[-1],
                          r.status)
                return None
        except asyncio.TimeoutError:
            log.debug("POLY-HTTP timeout: %s", url.split("polymarket.com")[-1])
            return None
        except Exception as exc:
            log.debug("POLY-HTTP err %s: %s",
                      url.split("polymarket.com")[-1], exc)
            return None

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
    from datetime import datetime
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None
