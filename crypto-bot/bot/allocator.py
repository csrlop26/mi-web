"""Asignador de capital por régimen de volatilidad (Opción C).

El bot opera ventanas de 5 y 15 min A LA VEZ y reparte el capital según
la volatilidad realizada del símbolo líder (BTC):

  vol ALTA  → el lag de Polymarket pesa más en la ventana corta → 5 min
              recibe hasta max_weight_short (80%) del peso.
  vol BAJA  → poca señal en 5 min; la probabilidad acumulada de la ventana
              larga rinde más → 15 min recibe el peso.
  entre medias → interpolación lineal.

El peso se convierte en multiplicador de tamaño: mult = min(1, 2·w).
Con reparto 50/50 ambas duraciones operan a tamaño completo (la caja, el
límite de posiciones y el gestor de riesgo acotan la exposición total);
en los extremos la duración desfavorecida queda a 0.4× y la favorecida a 1×.
"""
from __future__ import annotations

import logging

log = logging.getLogger("alloc")


class RegimeAllocator:
    def __init__(self, cfg, vol_fn, durations_minutes: list[int]):
        """vol_fn() -> volatilidad anualizada realizada del símbolo líder."""
        self.cfg = cfg
        self.vol_fn = vol_fn
        self.short_seconds = min(durations_minutes) * 60
        self.long_seconds = max(durations_minutes) * 60
        self.single = self.short_seconds == self.long_seconds
        self._last_logged_weight = -1.0

    def weight_short(self) -> float:
        """Peso [min_w, max_w] de la ventana corta según el régimen actual."""
        vol = self.vol_fn()
        lo, hi = self.cfg.vol_low, self.cfg.vol_high
        t = (vol - lo) / (hi - lo) if hi > lo else 0.5
        t = max(0.0, min(1.0, t))
        w = self.cfg.min_weight_short + t * (
            self.cfg.max_weight_short - self.cfg.min_weight_short)
        if abs(w - self._last_logged_weight) >= 0.15:
            self._last_logged_weight = w
            log.info("régimen: vol=%.2f → peso 5min=%.0f%% / 15min=%.0f%%",
                     vol, w * 100, (1 - w) * 100)
        return w

    def size_multiplier(self, window_seconds: float) -> float:
        """Multiplicador de tamaño para una ventana de esa duración."""
        if self.single:
            return 1.0
        w = self.weight_short()
        if window_seconds <= self.short_seconds:
            pass
        else:
            w = 1.0 - w
        return min(1.0, 2.0 * w)
