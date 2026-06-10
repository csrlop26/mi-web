"""Estrategia C — Market Maker ("el casino").

Cotiza ambos lados del mercado alrededor del precio justo y cobra el spread.
En el libro real esto serían órdenes limit reposando; en el motor del bot se
modela como: cuando el precio de mercado cruza una de nuestras cotizaciones,
ejecutamos a ese precio (somos la contrapartida pasiva).

Control de inventario: si acumulamos demasiado de un lado, dejamos de cotizar
ese lado y desplazamos la cotización para soltar inventario.
"""
from __future__ import annotations

import logging

from ..events import Action, PredictionQuote, Side, Signal

log = logging.getLogger("mm")


class MarketMakerStrategy:
    name = "market_maker"

    def __init__(self, cfg, fair_price_fn):
        """fair_price_fn(quote) -> probabilidad justa estimada de UP (o None)."""
        self.cfg = cfg
        self.fair_price = fair_price_fn
        self.last_quoted_mid: dict[tuple, float] = {}
        # inventario propio por (symbol, window_id, side) en USD de coste
        self.inventory: dict[tuple, float] = {}

    def on_quote(self, q: PredictionQuote) -> list[Signal]:
        if not self.cfg.enabled:
            return []
        fair = self.fair_price(q)
        if fair is None:
            fair = q.up_mid

        key = (q.symbol, q.window_id)
        last = self.last_quoted_mid.get(key)
        if last is not None and abs(fair - last) < self.cfg.requote_threshold:
            return []  # el precio justo apenas se movió: mantenemos cotizaciones
        self.last_quoted_mid[key] = fair

        half = self.cfg.spread / 2.0
        my_bid = max(0.01, fair - half)   # compro UP aquí
        my_ask = min(0.99, fair + half)   # vendo UP aquí (= compro DOWN a 1-ask)

        signals: list[Signal] = []

        # El mercado nos cruza el bid: alguien vende UP por debajo de nuestro bid.
        inv_up = self.inventory.get((q.symbol, q.window_id, Side.UP), 0.0)
        if q.up_ask <= my_bid and inv_up < self.cfg.max_inventory_usd:
            signals.append(Signal(
                strategy=self.name, symbol=q.symbol, window_id=q.window_id,
                side=Side.UP, action=Action.BUY, price=my_bid,
                size_usd=self.cfg.quote_size_usd,
                reason=f"mm: UP barato {q.up_ask:.2f} <= bid {my_bid:.2f}",
            ))

        # El mercado cruza el ask: UP caro → compramos DOWN (equivale a vender UP).
        inv_down = self.inventory.get((q.symbol, q.window_id, Side.DOWN), 0.0)
        if q.up_bid >= my_ask and inv_down < self.cfg.max_inventory_usd:
            signals.append(Signal(
                strategy=self.name, symbol=q.symbol, window_id=q.window_id,
                side=Side.DOWN, action=Action.BUY, price=1.0 - my_ask,
                size_usd=self.cfg.quote_size_usd,
                reason=f"mm: DOWN barato {1 - q.up_bid:.2f} <= {1 - my_ask:.2f}",
            ))

        # Gestión de inventario: si tenemos ambos lados, el par está garantizado
        # (UP+DOWN pagan $1 seguro) — no hace falta cerrar, la resolución liquida.
        return signals

    def on_fill(self, symbol: str, window_id: str, side: Side, cost_usd: float) -> None:
        k = (symbol, window_id, side)
        self.inventory[k] = self.inventory.get(k, 0.0) + cost_usd

    def on_resolution(self, symbol: str, window_id: str) -> None:
        for side in Side:
            self.inventory.pop((symbol, window_id, side), None)
        self.last_quoted_mid.pop((symbol, window_id), None)
