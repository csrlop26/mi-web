#!/usr/bin/env python3
"""PolyEdge — bot de mercados de predicción de Polymarket.

Modos:
  sim    Fase 1: mercado sintético, sin internet ni dependencias. EMPIEZA AQUÍ.
  paper  Fase 2: datos reales (Binance + Polymarket), dinero ficticio.
  live   Fase 3: dinero real. Requiere .env y --i-understand-the-risk.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from bot import config as config_mod
from bot.engine import Engine


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--mode", choices=["sim", "paper", "live"], default="sim")
    p.add_argument("--config", default=str(pathlib.Path(__file__).parent / "config.json"))
    p.add_argument("--windows", type=int,
                   help="(sim) nº de ventanas de la duración más larga")
    p.add_argument("--speed", type=float, help="(sim) aceleración del reloj")
    p.add_argument("--seed", type=int, help="(sim) semilla para reproducir una sesión")
    p.add_argument("--i-understand-the-risk", action="store_true",
                   help="obligatorio para el modo live")
    return p


def main() -> None:
    args = build_parser().parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)-10s %(message)s",
        datefmt="%H:%M:%S",
    )
    cfg = config_mod.load(args.config)

    # Overrides de línea de comandos para el simulador.
    if args.mode == "sim" and (args.windows or args.speed or args.seed is not None):
        import dataclasses
        sim = dataclasses.replace(
            cfg.sim,
            session_windows=args.windows or cfg.sim.session_windows,
            speed=args.speed or cfg.sim.speed,
            seed=args.seed if args.seed is not None else cfg.sim.seed,
        )
        cfg = dataclasses.replace(cfg, sim=sim)

    executor = None
    if args.mode == "sim":
        from bot.feeds.sim import SimFeed
        feeds = [SimFeed(cfg, cfg.symbols, cfg.durations_minutes)]
    else:
        from bot.feeds.binance import BinanceFeed
        from bot.feeds.polymarket import PolymarketFeed
        feeds = [BinanceFeed(cfg.symbols),
                 PolymarketFeed(cfg.symbols, cfg.durations_minutes)]
        if args.mode == "live":
            if not args.i_understand_the_risk:
                raise SystemExit(
                    "Modo live: añade --i-understand-the-risk para confirmar que "
                    "operarás con dinero real bajo tu responsabilidad.")
            from bot.execution import LiveExecutor
            executor = LiveExecutor(cfg.fees)

    logging.getLogger("main").info(
        "PolyEdge arrancando — modo=%s bankroll=$%.0f símbolos=%s",
        args.mode.upper(), cfg.bankroll, ",".join(cfg.symbols))

    engine = Engine(cfg, feeds, executor=executor)
    try:
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        print()  # el informe final se imprime desde Engine.run()


if __name__ == "__main__":
    main()
