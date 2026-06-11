"""Feed de precios spot reales de Binance (Fases 2 y 3).

Se conecta al websocket público de Binance (no requiere cuenta ni claves)
y emite SpotTick con cada operación ejecutada en el par <symbol>USDT.
"""
from __future__ import annotations

import json
import logging
import time

from ..events import SpotTick

log = logging.getLogger("binance")

WS_URL = "wss://stream.binance.com:9443/stream?streams={streams}"


class BinanceFeed:
    def __init__(self, symbols: list[str]):
        self.symbols = symbols
        self.stream_to_symbol = {f"{s.lower()}usdt@trade": s for s in symbols}

    async def events(self):
        try:
            import websockets
        except ImportError as exc:
            raise SystemExit(
                "Modo paper/live: instala dependencias → pip install -r requirements.txt"
            ) from exc

        url = WS_URL.format(streams="/".join(self.stream_to_symbol))
        import asyncio
        last_prices: dict[str, float] = {}
        last_log_ts = 0.0
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    log.info("BINANCE-OK Conectado: %s", ", ".join(self.symbols))
                    async for raw in ws:
                        msg = json.loads(raw)
                        data = msg.get("data", {})
                        stream = msg.get("stream", "")
                        symbol = self.stream_to_symbol.get(stream)
                        if symbol and "p" in data:
                            price = float(data["p"])
                            last_prices[symbol] = price
                            tick_ts = data.get("T", time.time() * 1000) / 1000.0
                            yield SpotTick(symbol=symbol, price=price, ts=tick_ts)
                            # Loguear precios en vivo cada 10 s para el monitor
                            now = time.time()
                            if now - last_log_ts >= 10.0 and len(last_prices) == len(self.symbols):
                                parts = "  ".join(f"{s}={last_prices[s]:,.2f}" for s in self.symbols if s in last_prices)
                                log.info("SPOT %s", parts)
                                last_log_ts = now
            except Exception as exc:
                log.warning("BINANCE-ERROR (%s); reintento en 3 s", exc)
                await asyncio.sleep(3)
