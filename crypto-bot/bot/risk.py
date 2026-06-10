"""Gestor de riesgo: la última palabra antes de cualquier orden.

Reglas, en orden de severidad:
1. Kill switch por drawdown: si la cartera cae `max_drawdown_pct` desde su
   pico histórico, el bot se apaga del todo.
2. Límite de pérdida diaria: si el día acumula `daily_loss_limit_pct` de
   pérdida, no se abren más posiciones hasta el día siguiente.
3. Tamaño máximo por operación: `max_trade_pct` del bankroll.
4. Máximo de posiciones abiertas simultáneas.

Las órdenes de CIERRE (reducir riesgo) se permiten siempre,
incluso con los límites activados.
"""
from __future__ import annotations

import logging
import time

from .events import Action, Signal

log = logging.getLogger("risk")


class RiskManager:
    def __init__(self, cfg, bankroll: float):
        self.cfg = cfg
        self.initial_bankroll = bankroll
        self.peak_equity = bankroll
        self.day_start_equity = bankroll
        self.day_id = self._day(time.time())
        self.killed = False
        self.daily_halt = False

    @staticmethod
    def _day(ts: float) -> int:
        return int(ts // 86400)

    def on_equity(self, equity: float, ts: float) -> None:
        """Actualiza pico, drawdown y corte diario con cada cambio de cartera."""
        day = self._day(ts)
        if day != self.day_id:
            self.day_id = day
            self.day_start_equity = equity
            if self.daily_halt:
                log.info("Nuevo día: se levanta el límite de pérdida diaria.")
            self.daily_halt = False

        self.peak_equity = max(self.peak_equity, equity)

        drawdown = 1.0 - equity / self.peak_equity
        if not self.killed and drawdown >= self.cfg.max_drawdown_pct:
            self.killed = True
            log.error(
                "KILL SWITCH: drawdown %.1f%% >= %.1f%%. El bot no abrirá más posiciones.",
                drawdown * 100, self.cfg.max_drawdown_pct * 100,
            )

        daily_loss = 1.0 - equity / self.day_start_equity
        if not self.daily_halt and daily_loss >= self.cfg.daily_loss_limit_pct:
            self.daily_halt = True
            log.warning(
                "Límite diario: pérdida del día %.1f%% >= %.1f%%. Sin nuevas posiciones hasta mañana.",
                daily_loss * 100, self.cfg.daily_loss_limit_pct * 100,
            )

    def approve(self, signal: Signal, equity: float, open_positions: int,
                reduces_risk: bool) -> Signal | None:
        """Devuelve la señal (quizá recortada de tamaño) o None si se rechaza."""
        if signal.action is Action.SELL or reduces_risk:
            return signal  # cerrar/reducir riesgo siempre está permitido

        if self.killed:
            return None
        if self.daily_halt:
            return None
        if open_positions >= self.cfg.max_open_positions:
            log.debug("Rechazada %s: máximo de posiciones abiertas.", signal.reason)
            return None

        max_usd = equity * self.cfg.max_trade_pct
        if signal.size_usd > max_usd:
            if max_usd < 1.0:
                return None
            signal = Signal(
                strategy=signal.strategy, symbol=signal.symbol,
                window_id=signal.window_id, side=signal.side,
                action=signal.action, price=signal.price,
                size_usd=max_usd, reason=signal.reason + " [recortada por riesgo]",
            )
        return signal
