"""Informes: línea de estado periódica en consola + informe final JSON en logs/."""
from __future__ import annotations

import asyncio
import json
import logging
import pathlib
import time

log = logging.getLogger("report")

LOGS_DIR = pathlib.Path(__file__).resolve().parent.parent / "logs"


class Reporter:
    def __init__(self, portfolio, risk, interval: float = 5.0):
        self.portfolio = portfolio
        self.risk = risk
        self.interval = interval
        self.fills: list[dict] = []
        self.resolutions = 0
        self.started = time.time()

    async def run(self) -> None:
        while True:
            await asyncio.sleep(self.interval)
            self.status_line()

    def status_line(self) -> None:
        p = self.portfolio
        eq = p.equity()
        flags = []
        if self.risk.killed:
            flags.append("KILL")
        if self.risk.daily_halt:
            flags.append("HALT-DIARIO")
        log.info(
            "equity=%.2f cash=%.2f pnl=%+.2f trades=%d win/loss=%d/%d "
            "abiertas=%d res=%d %s",
            eq, p.cash, p.realized_pnl, p.trades, p.wins, p.losses,
            p.open_position_count(), self.resolutions, " ".join(flags),
        )

    def on_fill(self, fill) -> None:
        s = fill.signal
        log.info("FILL %-12s %-4s %-4s %s @ %.3f  $%.2f  (%s)",
                 s.strategy, s.action.value, s.side.value,
                 s.window_id[-6:], fill.fill_price,
                 fill.shares * fill.fill_price, s.reason)
        self.fills.append({
            "ts": fill.ts, "strategy": s.strategy, "symbol": s.symbol,
            "window": s.window_id, "side": s.side.value,
            "action": s.action.value, "price": round(fill.fill_price, 4),
            "usd": round(fill.shares * fill.fill_price, 2),
            "reason": s.reason,
        })

    def on_resolution(self, res) -> None:
        self.resolutions += 1

    def final_report(self) -> None:
        p = self.portfolio
        eq = p.equity()
        report = {
            "duracion_seg": round(time.time() - self.started, 1),
            "equity_final": round(eq, 2),
            "pnl_realizado": round(p.realized_pnl, 2),
            "retorno_pct": round((eq / self.risk.initial_bankroll - 1) * 100, 2),
            "trades": p.trades,
            "ganadas": p.wins,
            "perdidas": p.losses,
            "winrate_pct": round(100 * p.wins / max(p.wins + p.losses, 1), 1),
            "comisiones": round(p.fees_paid, 2),
            "ventanas_resueltas": self.resolutions,
            "pnl_por_estrategia": {k: round(v, 2)
                                   for k, v in p.pnl_by_strategy.items()},
            "pnl_por_duracion": {k: round(v, 2)
                                 for k, v in p.pnl_by_duration.items()},
            "kill_switch": self.risk.killed,
            "fills": self.fills,
        }
        LOGS_DIR.mkdir(exist_ok=True)
        path = LOGS_DIR / f"session_{int(self.started)}.json"
        path.write_text(json.dumps(report, indent=2, ensure_ascii=False))

        log.info("=" * 62)
        log.info("INFORME DE SESIÓN")
        log.info("  Equity final     : $%.2f  (%+.2f%%)",
                 eq, report["retorno_pct"])
        log.info("  PnL realizado    : $%+.2f", p.realized_pnl)
        log.info("  Operaciones      : %d  (winrate %.1f%%)",
                 p.trades, report["winrate_pct"])
        for name, pnl in report["pnl_por_estrategia"].items():
            log.info("    - %-13s: $%+.2f", name, pnl)
        for name, pnl in report["pnl_por_duracion"].items():
            log.info("    - ventana %-6s: $%+.2f", name, pnl)
        log.info("  Informe completo : %s", path)
        log.info("=" * 62)
