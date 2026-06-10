"""Estrategia A — Momentum Lag ("el rezagado").

Idea: el precio spot de Binance se mueve ANTES de que el mercado up/down
de Polymarket lo refleje. La estrategia estima la probabilidad real de que
la ventana de 15 min cierre en verde usando el precio spot al instante,
y la compara con la probabilidad que cobra Polymarket. Si el hueco (edge)
supera el umbral, compra el lado infravalorado; cierra cuando el hueco se
evapora o deja que la ventana resuelva.

Modelo de probabilidad: el retorno restante de la ventana se aproxima como
normal con media 0 y desviación vol*sqrt(t_restante). La probabilidad de
cerrar en verde es la probabilidad de que el retorno restante no borre la
ventaja (o desventaja) acumulada desde la apertura.
"""
from __future__ import annotations

import logging
import math
from collections import deque

from ..events import Action, PredictionQuote, Side, Signal, SpotTick

log = logging.getLogger("momentum")

SECONDS_PER_YEAR = 365.25 * 24 * 3600


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


class MomentumLagStrategy:
    name = "momentum_lag"

    def __init__(self, cfg, annual_volatility: float, max_trade_usd: float):
        self.cfg = cfg
        self.vol = annual_volatility
        self.max_trade_usd = max_trade_usd
        self.last_spot: dict[str, float] = {}
        self.spot_history: dict[str, deque] = {}  # (ts, price) recientes
        # posiciones que esta estrategia cree tener: key -> (side, size_usd, entry_edge)
        self.holdings: dict[tuple, Side] = {}

    # ------------------------------------------------------------------ datos

    def on_tick(self, tick: SpotTick) -> None:
        self.last_spot[tick.symbol] = tick.price
        hist = self.spot_history.setdefault(tick.symbol, deque())
        hist.append((tick.ts, tick.price))
        cutoff = tick.ts - self.cfg.momentum_window_seconds
        while hist and hist[0][0] < cutoff:
            hist.popleft()

    def model_up_probability(self, q: PredictionQuote) -> float | None:
        """Probabilidad real estimada de que la ventana cierre en verde."""
        spot = self.last_spot.get(q.symbol)
        if spot is None or q.open_price <= 0:
            return None
        lead = math.log(spot / q.open_price)          # ventaja acumulada
        t = max(q.seconds_remaining, 1.0) / SECONDS_PER_YEAR
        sigma = self.vol * math.sqrt(t)               # ruido restante
        if sigma <= 0:
            return 1.0 if lead > 0 else 0.0
        return _norm_cdf(lead / sigma)

    # ----------------------------------------------------------------- señales

    def on_quote(self, q: PredictionQuote) -> list[Signal]:
        if not self.cfg.enabled:
            return []
        p_model = self.model_up_probability(q)
        if p_model is None:
            return []

        key = (q.symbol, q.window_id)
        signals: list[Signal] = []
        held = self.holdings.get(key)

        if held is not None:
            # ¿Toca cerrar? El hueco a favor se ha evaporado.
            edge = (p_model - q.up_ask) if held is Side.UP else ((1 - p_model) - (1 - q.up_bid))
            if edge <= self.cfg.take_profit_edge:
                exit_px = q.up_bid if held is Side.UP else (1.0 - q.up_ask)
                signals.append(Signal(
                    strategy=self.name, symbol=q.symbol, window_id=q.window_id,
                    side=held, action=Action.SELL, price=max(exit_px - 0.02, 0.001),
                    size_usd=float("inf"),  # el motor lo traduce a "toda la posición"
                    reason=f"cierre: edge {edge:+.3f} <= {self.cfg.take_profit_edge}",
                ))
            return signals

        if q.seconds_remaining < self.cfg.min_seconds_remaining:
            return []  # demasiado cerca de la resolución: el hueco ya no paga

        # ¿Hay hueco suficiente en algún lado?
        edge_up = p_model - q.up_ask
        edge_down = (1.0 - p_model) - (1.0 - q.up_bid)

        if edge_up >= self.cfg.min_edge and q.up_ask <= self.cfg.max_entry_price:
            signals.append(self._entry(q, Side.UP, q.up_ask, edge_up, p_model))
        elif edge_down >= self.cfg.min_edge and (1.0 - q.up_bid) <= self.cfg.max_entry_price:
            signals.append(self._entry(q, Side.DOWN, 1.0 - q.up_bid, edge_down, p_model))
        return signals

    def _entry(self, q: PredictionQuote, side: Side, price: float,
               edge: float, p_model: float) -> Signal:
        # Tamaño proporcional al hueco (más convicción, más tamaño), con tope.
        size = self.max_trade_usd * min(1.0, edge / (2 * self.cfg.min_edge))
        return Signal(
            strategy=self.name, symbol=q.symbol, window_id=q.window_id,
            side=side, action=Action.BUY,
            price=min(price + 0.01, 0.99), size_usd=max(size, 1.0),
            reason=f"lag: modelo={p_model:.2f} mercado={q.up_mid:.2f} edge={edge:+.3f}",
        )

    # ------------------------------------------------------------ contabilidad

    def on_fill(self, key: tuple, side: Side, opened: bool) -> None:
        if opened:
            self.holdings[key] = side
        else:
            self.holdings.pop(key, None)

    def on_resolution(self, key: tuple) -> None:
        self.holdings.pop(key, None)
