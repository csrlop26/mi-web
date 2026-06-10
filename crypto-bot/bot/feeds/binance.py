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
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    log.info("Conectado a Binance: %s", ", ".join(self.symbols))
                    async for raw in ws:
                        msg = json.loads(raw)
                        data = msg.get("data", {})
                        stream = msg.get("stream", "")
                        symbol = self.stream_to_symbol.get(stream)
                        if symbol and "p" in data:
                            yield SpotTick(
                                symbol=symbol,
                                price=float(data["p"]),
                                ts=data.get("T", time.time() * 1000) / 1000.0,
                            )
            except Exception as exc:  # reconexión con backoff simple
                log.warning("Binance desconectado (%s); reintento en 3 s", exc)
                import asyncio
                await asyncio.sleep(3)
