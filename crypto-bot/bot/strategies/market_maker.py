"""Estrategia C — Market Maker ("el casino"), versión 2.

Cotiza ambos lados del mercado alrededor del precio justo y cobra el spread.
En el libro real esto serían órdenes limit reposando; en el motor del bot se
modela como: cuando el precio de mercado cruza una de nuestras cotizaciones,
ejecutamos a ese precio (somos la contrapartida pasiva).

Mejoras v2 (orientadas a maximizar ganancia diaria):
1. SPREAD DINÁMICO: con el mercado tranquilo estrecha el spread (más fills,
   más volumen cobrado); con volatilidad alta lo ensancha (cada fill paga
   más y protege contra ser atropellado). Se mide con la vol del precio
   justo en los últimos 60 s.
2. SESGO DE INVENTARIO: si acumulamos UP, desplazamos las cotizaciones para
   favorecer el lado contrario y soltar inventario en vez de cargar riesgo.
3. RETIRADA FINAL: en los últimos segundos de la ventana el precio justo se
   mueve violentamente y el spread no compensa el riesgo → deja de cotizar.
"""
from __future__ import annotations

import logging
import math
from collections import deque

from ..events import Action, PredictionQuote, Side, Signal

log = logging.getLogger("mm")

VOL_WINDOW_SECONDS = 60.0
MIN_VOL_POINTS = 10


class MarketMakerStrategy:
    name = "market_maker"

    def __init__(self, cfg, fair_price_fn, size_mult_fn=None):
        """fair_price_fn(quote) -> probabilidad justa estimada de UP (o None).
        size_mult_fn(window_seconds) pondera el tamaño según el régimen."""
        self.cfg = cfg
        self.fair_price = fair_price_fn
        self.size_mult_fn = size_mult_fn or (lambda ws: 1.0)
        self.last_quoted_mid: dict[tuple, float] = {}
        self.fair_history: dict[tuple, deque] = {}  # (ts, fair) por mercado
        # inventario propio por (symbol, window_id, side) en USD de coste
        self.inventory: dict[tuple, float] = {}

    # ------------------------------------------------------------- spread vivo

    def _dynamic_spread(self, key: tuple, fair: float, ts: float) -> float:
        hist = self.fair_history.setdefault(key, deque())
        hist.append((ts, fair))
        cutoff = ts - VOL_WINDOW_SECONDS
        while hist and hist[0][0] < cutoff:
            hist.popleft()
        if len(hist) < MIN_VOL_POINTS:
            return self.cfg.base_spread
        diffs = [hist[i + 1][1] - hist[i][1] for i in range(len(hist) - 1)]
        mean = sum(diffs) / len(diffs)
        sigma = math.sqrt(sum((d - mean) ** 2 for d in diffs) / len(diffs))
        spread = self.cfg.base_spread + self.cfg.vol_multiplier * sigma * 10.0
        return min(self.cfg.max_spread, max(self.cfg.min_spread, spread))

    # ----------------------------------------------------------------- señales

    def on_quote(self, q: PredictionQuote) -> list[Signal]:
        if not self.cfg.enabled:
            return []
        if q.seconds_remaining < self.cfg.min_remaining_frac * q.window_seconds:
            return []  # retirada final: demasiado riesgo por fill

        fair = self.fair_price(q)
        if fair is None:
            return []

        # Si el modelo diverge demasiado del mercado el MM no gana spread:
        # está apostando direccional contra el consenso. Para cuando diverge
        # más de 25 puntos (ej. modelo=0.55 vs mercado=0.83).
        market_mid = (q.up_bid + q.up_ask) / 2.0
        if abs(fair - market_mid) > self.cfg.max_divergence:
            return []

        key = (q.symbol, q.window_id)
        spread = self._dynamic_spread(key, fair, q.ts)

        last = self.last_quoted_mid.get(key)
        if last is not None and abs(fair - last) < self.cfg.requote_threshold:
            return []  # el precio justo apenas se movió: mantenemos cotizaciones
        self.last_quoted_mid[key] = fair

        half = spread / 2.0
        inv_up = self.inventory.get((q.symbol, q.window_id, Side.UP), 0.0)
        inv_down = self.inventory.get((q.symbol, q.window_id, Side.DOWN), 0.0)

        # Sesgo de inventario: largo de UP → baja el centro (compra menos UP,
        # suelta UP / acumula DOWN antes), y viceversa.
        imbalance = (inv_up - inv_down) / max(self.cfg.max_inventory_usd, 1.0)
        imbalance = max(-1.0, min(1.0, imbalance))
        center = fair - imbalance * half * self.cfg.inventory_skew

        my_bid = max(0.01, center - half)   # compro UP aquí
        my_ask = min(0.99, center + half)   # vendo UP aquí (= compro DOWN a 1-ask)

        size = self.cfg.quote_size_usd * self.size_mult_fn(q.window_seconds)
        signals: list[Signal] = []

        # El mercado nos cruza el bid: alguien vende UP por debajo de nuestro bid.
        if q.up_ask <= my_bid and inv_up + size <= self.cfg.max_inventory_usd:
            signals.append(Signal(
                strategy=self.name, symbol=q.symbol, window_id=q.window_id,
                side=Side.UP, action=Action.BUY, price=my_bid,
                size_usd=size, passive=True, window_seconds=q.window_seconds,
                reason=f"mm: UP barato {q.up_ask:.2f} <= bid {my_bid:.2f} (spread {spread:.3f})",
            ))

        # El mercado cruza el ask: UP caro → compramos DOWN (equivale a vender UP).
        if q.up_bid >= my_ask and inv_down + size <= self.cfg.max_inventory_usd:
            signals.append(Signal(
                strategy=self.name, symbol=q.symbol, window_id=q.window_id,
                side=Side.DOWN, action=Action.BUY, price=1.0 - my_ask,
                size_usd=size, passive=True, window_seconds=q.window_seconds,
                reason=f"mm: DOWN barato {1 - q.up_bid:.2f} <= {1 - my_ask:.2f} (spread {spread:.3f})",
            ))

        # Si tenemos ambos lados, el par está garantizado (UP+DOWN pagan $1
        # seguro) — no hace falta cerrar, la resolución liquida.
        return signals

    def on_fill(self, symbol: str, window_id: str, side: Side, cost_usd: float) -> None:
        k = (symbol, window_id, side)
        self.inventory[k] = self.inventory.get(k, 0.0) + cost_usd

    def on_resolution(self, symbol: str, window_id: str) -> None:
        for side in Side:
            self.inventory.pop((symbol, window_id, side), None)
        self.last_quoted_mid.pop((symbol, window_id), None)
        self.fair_history.pop((symbol, window_id), None)
