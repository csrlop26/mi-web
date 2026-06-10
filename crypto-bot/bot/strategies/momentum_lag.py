"""Estrategia A — Momentum Lag ("el rezagado"), versión 2.

Idea: el precio spot de Binance se mueve ANTES de que el mercado up/down
de Polymarket lo refleje. La estrategia estima la probabilidad real de que
la ventana de 15 min cierre en verde usando el precio spot al instante,
y la compara con la probabilidad que cobra Polymarket. Si el hueco (edge)
supera el umbral, compra el lado infravalorado; cierra cuando el hueco se
evapora o deja que la ventana resuelva.

Mejoras v2 (orientadas a maximizar ganancia diaria):
1. VOLATILIDAD REALIZADA: en vez de una vol fija de config, estima la vol
   real del momento (EWMA de retornos tick a tick). Con vol bien medida,
   el modelo de probabilidad acierta más y el edge detectado es más fiable.
2. SEÑAL CRUZADA BTC→ALTS: ETH y SOL siguen a BTC con ~1-3 s de retraso.
   Si BTC acaba de moverse y el alt aún no lo ha recogido, el modelo del
   alt incorpora ese movimiento pendiente (cross_beta) y entra ANTES.
3. TAMAÑO COMPUESTO: el tamaño máximo por operación se calcula sobre el
   equity ACTUAL, no sobre el bankroll inicial → las ganancias se
   reinvierten automáticamente (interés compuesto).
4. Salida más rápida (take_profit_edge 0.01): rota el capital más veces
   por ventana en lugar de esperar a que el hueco se cierre del todo.
"""
from __future__ import annotations

import logging
import math
from collections import deque

from ..events import Action, PredictionQuote, Side, Signal, SpotTick

log = logging.getLogger("momentum")

SECONDS_PER_YEAR = 365.25 * 24 * 3600
EWMA_LAMBDA = 0.999          # memoria del estimador de volatilidad
MIN_VOL_SAMPLES = 100        # ticks mínimos antes de fiarse de la vol realizada


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


class MomentumLagStrategy:
    name = "momentum_lag"

    def __init__(self, cfg, fallback_volatility: float, max_trade_usd_fn):
        """max_trade_usd_fn() devuelve el tamaño máximo actual por operación
        (equity vivo × max_trade_pct) → reinversión automática de ganancias."""
        self.cfg = cfg
        self.fallback_vol = fallback_volatility
        self.max_trade_usd_fn = max_trade_usd_fn
        self.last_spot: dict[str, float] = {}
        self.last_tick_ts: dict[str, float] = {}
        self.spot_history: dict[str, deque] = {}    # (ts, price) recientes
        self.var_rate: dict[str, float] = {}        # EWMA de varianza por segundo
        self.vol_samples: dict[str, int] = {}
        self.holdings: dict[tuple, Side] = {}

    # ------------------------------------------------------------------ datos

    def on_tick(self, tick: SpotTick) -> None:
        prev = self.last_spot.get(tick.symbol)
        prev_ts = self.last_tick_ts.get(tick.symbol)
        self.last_spot[tick.symbol] = tick.price
        self.last_tick_ts[tick.symbol] = tick.ts

        hist = self.spot_history.setdefault(tick.symbol, deque())
        hist.append((tick.ts, tick.price))
        cutoff = tick.ts - self.cfg.momentum_window_seconds
        while hist and hist[0][0] < cutoff:
            hist.popleft()

        # Estimador EWMA de volatilidad realizada (varianza por segundo).
        if prev and prev_ts is not None:
            dt = tick.ts - prev_ts
            if dt > 0:
                r = math.log(tick.price / prev)
                inst = (r * r) / dt
                old = self.var_rate.get(tick.symbol, inst)
                self.var_rate[tick.symbol] = EWMA_LAMBDA * old + (1 - EWMA_LAMBDA) * inst
                self.vol_samples[tick.symbol] = self.vol_samples.get(tick.symbol, 0) + 1

    def annual_vol(self, symbol: str) -> float:
        """Vol realizada anualizada; usa la de config hasta tener muestra."""
        if self.vol_samples.get(symbol, 0) >= MIN_VOL_SAMPLES:
            return math.sqrt(self.var_rate[symbol] * SECONDS_PER_YEAR)
        return self.fallback_vol

    def _recent_return(self, symbol: str) -> float:
        """Retorno log del símbolo dentro de la ventana de momentum."""
        hist = self.spot_history.get(symbol)
        if not hist or len(hist) < 2 or hist[0][1] <= 0:
            return 0.0
        return math.log(hist[-1][1] / hist[0][1])

    def model_up_probability(self, q: PredictionQuote) -> float | None:
        """Probabilidad real estimada de que la ventana cierre en verde."""
        spot = self.last_spot.get(q.symbol)
        if spot is None or q.open_price <= 0:
            return None
        lead = math.log(spot / q.open_price)  # ventaja acumulada

        # Señal cruzada: movimiento reciente de BTC que el alt aún no recoge.
        lead_sym = self.cfg.lead_symbol
        if q.symbol != lead_sym and lead_sym in self.last_spot:
            catchup = self.cfg.cross_beta * (
                self._recent_return(lead_sym) - self._recent_return(q.symbol))
            lead += catchup

        t = max(q.seconds_remaining, 1.0) / SECONDS_PER_YEAR
        sigma = self.annual_vol(q.symbol) * math.sqrt(t)  # ruido restante
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
        # Tamaño proporcional al hueco (más convicción, más tamaño), con tope
        # sobre el equity ACTUAL → las ganancias componen.
        max_usd = self.max_trade_usd_fn()
        size = max_usd * min(1.0, edge / (2 * self.cfg.min_edge))
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
