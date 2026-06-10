"""Feed sintético (Fase 1): un Binance y un Polymarket de mentira.

- El precio spot sigue un paseo aleatorio (GBM) con saltos ocasionales,
  como BTC en la vida real.
- El mercado de predicción cotiza la probabilidad de "cierre en verde"...
  pero usando el precio spot DE HACE UNOS SEGUNDOS (polymarket_lag_seconds).
  Esa es exactamente la ineficiencia que la Estrategia A explota en el
  mercado real, según la documentación pública de los bots rentables de 2026.
- Cada `window_minutes` se resuelve la ventana y se abre la siguiente.

El reloj corre acelerado por `speed` (20x → una ventana de 15 min dura 45 s).
"""
from __future__ import annotations

import asyncio
import math
import random
from collections import deque

from ..events import PredictionQuote, SpotTick, WindowResolution

SECONDS_PER_YEAR = 365.25 * 24 * 3600


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


class SimFeed:
    def __init__(self, cfg, symbols: list[str], window_minutes: int):
        self.cfg = cfg.sim
        self.symbols = symbols
        self.window_seconds = window_minutes * 60
        self.rng = random.Random(self.cfg.seed)
        self.spread = 0.02  # spread del mercado simulado (2 céntimos)

    async def events(self):
        """Genera SpotTick, PredictionQuote y WindowResolution en orden temporal."""
        dt = 0.5  # paso de tiempo simulado, en segundos de mercado
        sleep = dt / self.cfg.speed
        vol_per_step = self.cfg.annual_volatility * math.sqrt(dt / SECONDS_PER_YEAR)
        jump_p = self.cfg.jump_probability_per_min * dt / 60.0
        lag_steps = max(1, int(self.cfg.polymarket_lag_seconds / dt))

        price = {s: 100_000.0 if s == "BTC" else 3_000.0 for s in self.symbols}
        history: dict[str, deque] = {s: deque(maxlen=lag_steps + 1) for s in self.symbols}

        t = 0.0
        for w in range(self.cfg.session_windows):
            window_id = f"w{w:03d}"
            open_price = dict(price)
            window_end = t + self.window_seconds

            while t < window_end:
                t += dt
                for s in self.symbols:
                    # Paseo aleatorio + salto ocasional (momentum real que
                    # el mercado simulado tarda en digerir).
                    z = self.rng.gauss(0.0, vol_per_step)
                    if self.rng.random() < jump_p:
                        z += self.rng.choice((-1, 1)) * self.rng.uniform(2, 5) * vol_per_step * 10
                    price[s] *= math.exp(z)
                    history[s].append(price[s])

                    yield SpotTick(symbol=s, price=price[s], ts=t)

                    # El mercado de predicción cotiza con el precio RETRASADO.
                    lagged = history[s][0]
                    remaining = max(window_end - t, 1.0)
                    sigma = self.cfg.annual_volatility * math.sqrt(
                        remaining / SECONDS_PER_YEAR)
                    lead = math.log(lagged / open_price[s])
                    fair_lagged = _norm_cdf(lead / sigma) if sigma > 0 else (
                        1.0 if lead > 0 else 0.0)
                    noise = self.rng.gauss(0.0, 0.005)
                    mid = min(0.99, max(0.01, fair_lagged + noise))
                    half = self.spread / 2.0
                    yield PredictionQuote(
                        symbol=s, window_id=window_id,
                        open_price=open_price[s],
                        up_bid=max(0.01, mid - half),
                        up_ask=min(0.99, mid + half),
                        seconds_remaining=window_end - t, ts=t,
                    )
                await asyncio.sleep(sleep)

            for s in self.symbols:
                yield WindowResolution(
                    symbol=s, window_id=window_id,
                    up_won=price[s] > open_price[s],
                    close_price=price[s], ts=t,
                )
