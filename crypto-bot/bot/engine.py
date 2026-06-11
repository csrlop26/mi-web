"""Motor del bot: conecta feeds → estrategias → riesgo → ejecución → cartera.

Flujo por evento:
  SpotTick          → actualiza el modelo de la Estrategia A
  PredictionQuote   → ambas estrategias proponen señales
                      → el gestor de riesgo aprueba/recorta/rechaza
                      → el ejecutor intenta el fill
                      → la cartera y las estrategias se actualizan
  WindowResolution  → la cartera cobra los contratos ganadores
"""
from __future__ import annotations

import asyncio
import logging
import math

from .events import Action, Fill, PredictionQuote, Signal, SpotTick, WindowResolution
from .allocator import RegimeAllocator
from .execution import PaperExecutor
from .portfolio import Portfolio
from .reporting import Reporter
from .risk import RiskManager
from .strategies.market_maker import MarketMakerStrategy
from .strategies.momentum_lag import MomentumLagStrategy

log = logging.getLogger("engine")


class Engine:
    def __init__(self, cfg, feeds: list, executor=None):
        self.cfg = cfg
        self.feeds = feeds
        self.portfolio = Portfolio(cfg.bankroll)
        self.risk = RiskManager(cfg.risk, cfg.bankroll)
        self.executor = executor or PaperExecutor(cfg.fees)
        self.reporter = Reporter(self.portfolio, self.risk)

        # Tamaño sobre el equity vivo: las ganancias componen automáticamente.
        def max_trade_usd() -> float:
            return min(self.portfolio.equity() * cfg.risk.max_trade_pct,
                       cfg.risk.max_trade_usd)

        from .fees import taker_fee_rate
        fee_rate = cfg.fees.dynamic_fee_rate
        self.momentum = MomentumLagStrategy(
            cfg.momentum_lag, cfg.sim.annual_volatility, max_trade_usd,
            fee_fn=lambda p: taker_fee_rate(p, fee_rate))
        self.allocator = RegimeAllocator(
            cfg.allocator,
            vol_fn=lambda: self.momentum.annual_vol(cfg.allocator.lead_symbol),
            durations_minutes=cfg.durations_minutes)
        self.momentum.size_mult_fn = self.allocator.size_multiplier
        self.market_maker = MarketMakerStrategy(
            cfg.market_maker, self.momentum.model_up_probability,
            size_mult_fn=self.allocator.size_multiplier)
        self.last_quote: dict[tuple, PredictionQuote] = {}

    # ------------------------------------------------------------------ bucle

    async def run(self) -> None:
        queue: asyncio.Queue = asyncio.Queue(maxsize=10_000)
        pumps = [asyncio.create_task(self._pump(f, queue)) for f in self.feeds]
        report_task = asyncio.create_task(self.reporter.run())
        try:
            while pumps or not queue.empty():
                pumps = [p for p in pumps if not p.done()]
                try:
                    event = queue.get_nowait()
                except asyncio.QueueEmpty:
                    if not pumps:
                        break  # feeds terminados y cola drenada
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    except asyncio.TimeoutError:
                        continue
                self._dispatch(event)
        finally:
            for p in pumps:
                p.cancel()
            report_task.cancel()
            self.reporter.final_report()

    @staticmethod
    async def _pump(feed, queue: asyncio.Queue) -> None:
        async for event in feed.events():
            await queue.put(event)

    # ----------------------------------------------------------------- eventos

    def _dispatch(self, event) -> None:
        if isinstance(event, SpotTick):
            self.momentum.on_tick(event)
        elif isinstance(event, PredictionQuote):
            self.portfolio.on_quote(event)
            self.last_quote[(event.symbol, event.window_id)] = event
            signals = (self.momentum.on_quote(event)
                       + self.market_maker.on_quote(event))
            for sig in signals:
                self._try_execute(sig, event)
            self.risk.on_equity(self.portfolio.equity(), event.ts)
        elif isinstance(event, WindowResolution):
            self.portfolio.resolve_window(event)
            self.momentum.on_resolution((event.symbol, event.window_id))
            self.market_maker.on_resolution(event.symbol, event.window_id)
            self.risk.on_equity(self.portfolio.equity(), event.ts)
            self.reporter.on_resolution(event)

    def _try_execute(self, sig: Signal, quote: PredictionQuote) -> None:
        # Una venta "infinita" significa "cierra toda la posición".
        if sig.action is Action.SELL and math.isinf(sig.size_usd):
            key = (sig.strategy, sig.symbol, sig.window_id, sig.side)
            pos = self.portfolio.positions.get(key)
            if pos is None:
                return
            import dataclasses as _dc
            sig = _dc.replace(sig, size_usd=pos.shares * max(sig.price, 0.01))

        approved = self.risk.approve(
            sig, self.portfolio.equity(),
            self.portfolio.open_position_count(),
            reduces_risk=(sig.action is Action.SELL),
        )
        if approved is None:
            return
        if approved.action is Action.BUY and approved.size_usd > self.portfolio.cash:
            return  # sin efectivo suficiente

        fill = self.executor.execute(approved, quote, quote.ts)
        if fill is None:
            return
        self._apply_fill(fill)

    def _apply_fill(self, fill: Fill) -> None:
        s = fill.signal
        self.portfolio.apply_fill(fill)
        if s.strategy == self.momentum.name:
            self.momentum.on_fill((s.symbol, s.window_id), s.side,
                                  opened=(s.action is Action.BUY))
        elif s.strategy == self.market_maker.name and s.action is Action.BUY:
            self.market_maker.on_fill(s.symbol, s.window_id, s.side,
                                      fill.shares * fill.fill_price)
        self.reporter.on_fill(fill)
