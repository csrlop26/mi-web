"""Cartera: efectivo, posiciones abiertas y PnL.

Cada contrato comprado a precio p (probabilidad) paga $1 si acierta.
PnL realizado = cobros por resolución + ventas - costes - comisiones.
"""
from __future__ import annotations

import logging
from collections import defaultdict

from .events import Action, Fill, Position, PredictionQuote, Side, WindowResolution

log = logging.getLogger("portfolio")


class Portfolio:
    def __init__(self, bankroll: float):
        self.cash = bankroll
        self.positions: dict[tuple, Position] = {}  # (strategy, symbol, window_id, side)
        self.last_quotes: dict[tuple, PredictionQuote] = {}  # (symbol, window_id)
        self.realized_pnl = 0.0
        self.fees_paid = 0.0
        self.trades = 0
        self.wins = 0
        self.losses = 0
        self.pnl_by_strategy: dict[str, float] = defaultdict(float)
        self.pnl_by_duration: dict[str, float] = defaultdict(float)

    # ------------------------------------------------------------------ fills

    def apply_fill(self, fill: Fill) -> None:
        s = fill.signal
        key = (s.strategy, s.symbol, s.window_id, s.side)
        self.trades += 1
        self.fees_paid += fill.fee_usd

        if s.action is Action.BUY:
            cost = fill.shares * fill.fill_price
            self.cash -= cost + fill.fee_usd
            pos = self.positions.get(key)
            if pos is None:
                pos = Position(strategy=s.strategy, symbol=s.symbol,
                               window_id=s.window_id, side=s.side,
                               shares=0.0, cost_usd=0.0,
                               window_seconds=s.window_seconds)
                self.positions[key] = pos
            pos.shares += fill.shares
            pos.cost_usd += cost
            pos.entries.append(fill)
        else:  # SELL: cierre total o parcial
            pos = self.positions.get(key)
            if pos is None or pos.shares <= 0:
                log.warning("Venta sin posición: %s", key)
                return
            shares = min(fill.shares, pos.shares)
            avg = pos.avg_price
            proceeds = shares * fill.fill_price
            pnl = proceeds - shares * avg - fill.fee_usd
            self.cash += proceeds - fill.fee_usd
            pos.shares -= shares
            pos.cost_usd -= shares * avg
            self._book_pnl(s.strategy, pnl, pos.window_seconds)
            if pos.shares <= 1e-9:
                del self.positions[key]

    # ------------------------------------------------------------- resolución

    def resolve_window(self, res: WindowResolution) -> None:
        """Paga $1 por contrato ganador y liquida los perdedores a 0."""
        winning = Side.UP if res.up_won else Side.DOWN
        for key in [k for k in self.positions
                    if k[1] == res.symbol and k[2] == res.window_id]:
            pos = self.positions.pop(key)
            payout = pos.shares if pos.side is winning else 0.0
            pnl = payout - pos.cost_usd
            self.cash += payout
            self._book_pnl(pos.strategy, pnl, pos.window_seconds)
            log.info("Resuelta %s %s/%s %s: %+.2f USD",
                     pos.strategy, res.symbol, res.window_id[-6:],
                     pos.side.value, pnl)
        self.last_quotes.pop((res.symbol, res.window_id), None)

    def _book_pnl(self, strategy: str, pnl: float,
                  window_seconds: float = 0.0) -> None:
        self.realized_pnl += pnl
        self.pnl_by_strategy[strategy] += pnl
        if window_seconds:
            self.pnl_by_duration[f"{int(window_seconds // 60)}min"] += pnl
        if pnl >= 0:
            self.wins += 1
        else:
            self.losses += 1

    # --------------------------------------------------------------- mark-to-market

    def on_quote(self, q: PredictionQuote) -> None:
        self.last_quotes[(q.symbol, q.window_id)] = q

    def equity(self) -> float:
        value = self.cash
        for pos in self.positions.values():
            q = self.last_quotes.get((pos.symbol, pos.window_id))
            if q is None:
                value += pos.cost_usd  # sin cotización: valora a coste
                continue
            mid = q.up_mid if pos.side is Side.UP else 1.0 - q.up_mid
            value += pos.shares * mid
        return value

    def open_position_count(self) -> int:
        return len(self.positions)

    def inventory_usd(self, strategy: str, symbol: str, window_id: str,
                      side: Side) -> float:
        pos = self.positions.get((strategy, symbol, window_id, side))
        return pos.cost_usd if pos else 0.0
