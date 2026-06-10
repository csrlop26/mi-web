"""Feed de mercados up/down reales de Polymarket (Fases 2 y 3).

Descubre los mercados cripto de corto plazo activos vía la Gamma API pública
(no requiere claves para LEER) y emite PredictionQuote con el libro del CLOB.

Polymarket lista mercados del estilo "Bitcoin Up or Down — June 10, 3:45 PM ET"
en series de 15 minutos. La Gamma API no expone el precio de apertura de la
ventana, así que open_price se emite a 0 y la estrategia lo captura por su
cuenta desde el spot de Binance al inicio de cada ventana.

Descubrimiento en tres intentos (la API cambia de forma con frecuencia):
  1. /events?slug=<serie>            (slug exacto de la serie recurrente)
  2. /markets?closed=false&order=endDate&ascending=true  + filtro por texto
  3. /public-search?q=<consulta>     (último recurso)
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
DISCOVERY_BACKOFF = 30.0  # segundos entre reintentos si no hay mercado

SERIES_SLUG = {  # series oficiales de mercados up/down
    "BTC": "bitcoin-up-or-down",
    "ETH": "ethereum-up-or-down",
    "SOL": "solana-up-or-down",
}
SEARCH_NAME = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana"}


class PolymarketFeed:
    def __init__(self, symbols: list[str], window_minutes: int):
        self.symbols = [s for s in symbols if s in SERIES_SLUG]
        self.window_minutes = window_minutes
        if not self.symbols:
            raise SystemExit(f"Polymarket: ningún símbolo soportado en {symbols}")

    async def events(self):
        try:
            import aiohttp
        except ImportError as exc:
            raise SystemExit(
                "Modo paper/live: instala dependencias → pip install -r requirements.txt"
            ) from exc

        async with aiohttp.ClientSession(
                headers={"User-Agent": "polyedge-bot/1.0"}) as http:
            active: dict[str, dict] = {}        # symbol -> mercado vigente
            next_discovery: dict[str, float] = {}  # symbol -> ts mínimo de reintento
            while True:
                now = time.time()
                for symbol in self.symbols:
                    market = active.get(symbol)
                    if market is None or now >= market["end_ts"]:
                        if market is not None:
                            res = await self._resolve(http, market)
                            if res is not None:
                                yield res
                            active[symbol] = None
                        if now < next_discovery.get(symbol, 0.0):
                            continue
                        market = await self._discover(http, symbol)
                        active[symbol] = market
                        if market is None:
                            next_discovery[symbol] = now + DISCOVERY_BACKOFF
                            continue
                    quote = await self._quote(http, market, now)
                    if quote is not None:
                        yield quote
                await asyncio.sleep(1.0)

    # ------------------------------------------------------------ descubrimiento

    async def _discover(self, http, symbol: str) -> dict | None:
        """Busca el mercado up/down vigente probando varias rutas de la API."""
        markets = (await self._via_event_slug(http, symbol)
                   or await self._via_market_listing(http, symbol)
                   or await self._via_search(http, symbol))
        if not markets:
            log.warning("%s: sin mercado up/down activo (reintento en %.0f s). "
                        "Si esto persiste, revisa que la serie '%s' exista en "
                        "polymarket.com", symbol, DISCOVERY_BACKOFF,
                        SERIES_SLUG[symbol])
            return None
        # El mercado válido más próximo a expirar = la ventana vigente.
        markets.sort(key=lambda m: m["end_ts"])
        m = markets[0]
        log.info("%s: mercado activo '%s' (cierra en %.0f s)",
                 symbol, m["question"], m["end_ts"] - time.time())
        return m

    async def _via_event_slug(self, http, symbol: str) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/events",
                               {"slug": SERIES_SLUG[symbol], "closed": "false",
                                "limit": "10"})
        out = []
        for ev in data or []:
            out += self._parse_markets(symbol, ev.get("markets", []))
        return out

    async def _via_market_listing(self, http, symbol: str) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"closed": "false", "order": "endDate",
                                "ascending": "true", "limit": "200"})
        name = SEARCH_NAME[symbol]
        candidates = [m for m in data or []
                      if name in (m.get("question") or "").lower()
                      and "up or down" in (m.get("question") or "").lower()]
        return self._parse_markets(symbol, candidates)

    async def _via_search(self, http, symbol: str) -> list[dict]:
        data = await self._get(http, f"{GAMMA_API}/public-search",
                               {"q": f"{SEARCH_NAME[symbol]} up or down",
                                "limit_per_type": "10"})
        events = (data or {}).get("events", []) if isinstance(data, dict) else []
        out = []
        for ev in events:
            out += self._parse_markets(symbol, ev.get("markets", []))
        return out

    def _parse_markets(self, symbol: str, raw_markets: list) -> list[dict]:
        """Filtra mercados con tokens y fecha de cierre futura y los normaliza."""
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
            # Solo ventanas cortas: descarta mercados diarios/mensuales colados.
            if end_ts - now > self.window_minutes * 60 * 2:
                continue
            out.append({
                "symbol": symbol,
                "window_id": m.get("conditionId") or str(m.get("id", "?")),
                "question": m.get("question", "?"),
                "up_token": tokens[0],   # primer token = "Up"
                "end_ts": end_ts,
                "condition_id": m.get("conditionId"),
            })
        return out

    async def _get(self, http, url: str, params: dict):
        try:
            async with http.get(url, params=params, timeout=10) as r:
                if r.status != 200:
                    log.debug("GET %s -> HTTP %d", url, r.status)
                    return None
                return await r.json()
        except Exception as exc:
            log.debug("GET %s falló: %s", url, exc)
            return None

    # ----------------------------------------------------------------- mercado

    async def _quote(self, http, market: dict, now: float) -> PredictionQuote | None:
        book = await self._get(http, f"{CLOB_API}/book",
                               {"token_id": market["up_token"]})
        bids = (book or {}).get("bids") or []
        asks = (book or {}).get("asks") or []
        if not bids or not asks:
            return None
        # El libro del CLOB llega ordenado desde el peor precio: el mejor
        # bid es el más alto y el mejor ask el más bajo.
        best_bid = max(float(b["price"]) for b in bids)
        best_ask = min(float(a["price"]) for a in asks)
        if best_bid <= 0 or best_ask >= 1 or best_bid >= best_ask:
            return None
        return PredictionQuote(
            symbol=market["symbol"], window_id=market["window_id"],
            open_price=0.0,  # no lo da la API: lo captura la estrategia
            up_bid=best_bid, up_ask=best_ask,
            seconds_remaining=max(market["end_ts"] - now, 0.0), ts=now,
        )

    async def _resolve(self, http, market: dict) -> WindowResolution | None:
        """Consulta el resultado oficial cuando la ventana expira."""
        await asyncio.sleep(5)  # margen para que el oráculo publique
        data = await self._get(http, f"{GAMMA_API}/markets",
                               {"condition_ids": market["condition_id"]})
        for m in data or []:
            prices = m.get("outcomePrices")
            if prices:
                p = _json.loads(prices) if isinstance(prices, str) else prices
                return WindowResolution(
                    symbol=market["symbol"], window_id=market["window_id"],
                    up_won=float(p[0]) > 0.5, close_price=0.0, ts=time.time(),
                )
        log.warning("%s: la ventana %s expiró sin resultado publicado aún",
                    market["symbol"], market["question"])
        return None


def _parse_iso(s: str) -> float | None:
    from datetime import datetime
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None
