"""Feed de mercados up/down reales de Polymarket (Fases 2 y 3).

Descubre los mercados cripto de corto plazo activos vía la Gamma API pública
(no requiere claves para LEER) y emite PredictionQuote con el libro del CLOB.

Polymarket lista mercados del estilo "Bitcoin Up or Down — June 10, 3:45 PM ET"
en series de 15 minutos. Este feed:
  1. Pregunta a la Gamma API por los mercados activos de la serie.
  2. Sondea el libro de órdenes del CLOB (REST) cada ~1 s.
  3. Al expirar, emite la resolución usando el resultado oficial.
"""
from __future__ import annotations

import asyncio
import logging
import time

from ..events import PredictionQuote, WindowResolution

log = logging.getLogger("polymarket")

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"

SERIES_SLUG = {  # series oficiales de mercados up/down de 15 minutos
    "BTC": "bitcoin-up-or-down",
    "ETH": "ethereum-up-or-down",
    "SOL": "solana-up-or-down",
}


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

        async with aiohttp.ClientSession() as http:
            active: dict[str, dict] = {}  # symbol -> info del mercado vigente
            while True:
                now = time.time()
                for symbol in self.symbols:
                    market = active.get(symbol)
                    if market is None or now >= market["end_ts"]:
                        if market is not None:
                            res = await self._resolve(http, market)
                            if res is not None:
                                yield res
                        market = await self._discover(http, symbol)
                        active[symbol] = market
                        if market is None:
                            continue
                    quote = await self._quote(http, market, now)
                    if quote is not None:
                        yield quote
                await asyncio.sleep(1.0)

    async def _discover(self, http, symbol: str) -> dict | None:
        """Busca el mercado up/down vigente de la serie del símbolo."""
        params = {"slug": SERIES_SLUG[symbol], "closed": "false", "limit": "5"}
        try:
            async with http.get(f"{GAMMA_API}/events", params=params, timeout=10) as r:
                events = await r.json()
        except Exception as exc:
            log.warning("Gamma API no disponible (%s)", exc)
            return None
        for ev in events or []:
            for m in ev.get("markets", []):
                end = m.get("endDateIso") or m.get("endDate")
                token_ids = m.get("clobTokenIds")
                if not end or not token_ids:
                    continue
                import json as _json
                tokens = _json.loads(token_ids) if isinstance(token_ids, str) else token_ids
                end_ts = _parse_iso(end)
                if end_ts and end_ts > time.time():
                    log.info("%s: mercado activo '%s' (cierra en %.0f s)",
                             symbol, m.get("question", "?"), end_ts - time.time())
                    return {
                        "symbol": symbol,
                        "window_id": m.get("conditionId", m.get("id", "?")),
                        "up_token": tokens[0],   # primer token = "Up"
                        "end_ts": end_ts,
                        "open_price": float(m.get("openPrice") or 0) or None,
                        "condition_id": m.get("conditionId"),
                    }
        log.warning("%s: sin mercado up/down activo ahora mismo", symbol)
        return None

    async def _quote(self, http, market: dict, now: float) -> PredictionQuote | None:
        try:
            async with http.get(f"{CLOB_API}/book",
                                params={"token_id": market["up_token"]},
                                timeout=10) as r:
                book = await r.json()
        except Exception as exc:
            log.debug("CLOB book error: %s", exc)
            return None
        bids = book.get("bids") or []
        asks = book.get("asks") or []
        if not bids or not asks:
            return None
        return PredictionQuote(
            symbol=market["symbol"], window_id=market["window_id"],
            open_price=market.get("open_price") or 0.0,
            up_bid=float(bids[0]["price"]), up_ask=float(asks[0]["price"]),
            seconds_remaining=max(market["end_ts"] - now, 0.0), ts=now,
        )

    async def _resolve(self, http, market: dict) -> WindowResolution | None:
        """Consulta el resultado oficial cuando la ventana expira."""
        await asyncio.sleep(5)  # margen para que el oráculo publique
        try:
            async with http.get(f"{GAMMA_API}/markets",
                                params={"condition_ids": market["condition_id"]},
                                timeout=10) as r:
                data = await r.json()
        except Exception:
            return None
        for m in data or []:
            prices = m.get("outcomePrices")
            if prices:
                import json as _json
                p = _json.loads(prices) if isinstance(prices, str) else prices
                return WindowResolution(
                    symbol=market["symbol"], window_id=market["window_id"],
                    up_won=float(p[0]) > 0.5, close_price=0.0, ts=time.time(),
                )
        return None


def _parse_iso(s: str) -> float | None:
    from datetime import datetime
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None
