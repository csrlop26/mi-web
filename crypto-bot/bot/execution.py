"""Ejecutores de órdenes.

- PaperExecutor: simula ejecuciones contra la última cotización conocida,
  aplicando slippage y comisiones configurables. Se usa en los modos sim y paper.
- LiveExecutor: esqueleto para operar de verdad vía la CLOB API de Polymarket
  (py-clob-client). Deliberadamente exige credenciales y confirmación explícita.
"""
from __future__ import annotations

import logging

from .events import Action, Fill, PredictionQuote, Side, Signal
from .fees import DEFAULT_FEE_RATE, taker_fee_per_share

log = logging.getLogger("exec")


class PaperExecutor:
    def __init__(self, fees_cfg):
        self.slippage = fees_cfg.slippage_bps / 10_000.0
        self.fee_rate = getattr(fees_cfg, "dynamic_fee_rate", DEFAULT_FEE_RATE)
        self.maker_fee = fees_cfg.maker_bps / 10_000.0

    def execute(self, signal: Signal, quote: PredictionQuote, ts: float) -> Fill | None:
        # Precio del contrato según el lado y la dirección de la orden.
        if signal.side is Side.UP:
            px = quote.up_ask if signal.action is Action.BUY else quote.up_bid
        else:
            px = (1.0 - quote.up_bid) if signal.action is Action.BUY else (1.0 - quote.up_ask)

        # Las órdenes pasivas (maker) ejecutan a su precio, sin slippage:
        # somos nosotros los que esperamos en el libro.
        if not signal.passive:
            if signal.action is Action.BUY:
                px = min(0.999, px * (1.0 + self.slippage))
            else:
                px = max(0.001, px * (1.0 - self.slippage))

        # Respeta el precio límite de la señal.
        if signal.action is Action.BUY and px > signal.price + 1e-9:
            return None
        if signal.action is Action.SELL and px < signal.price - 1e-9:
            return None

        shares = signal.size_usd / px
        # Fee dinámica de Polymarket 2026: POR CONTRATO (C·rate·p(1-p)),
        # pico 1.8¢/contrato en p=0.50, casi nada en los extremos. Maker: 0.
        fee = (signal.size_usd * self.maker_fee if signal.passive
               else shares * taker_fee_per_share(px, self.fee_rate))
        return Fill(signal=signal, fill_price=px, shares=shares, fee_usd=fee, ts=ts)


class LiveExecutor:
    """Ejecución real en Polymarket. Requiere py-clob-client y claves en .env.

    Se mantiene mínimo a propósito: la lógica de estrategia y riesgo es idéntica
    a paper; aquí solo cambia dónde aterriza la orden.
    """

    def __init__(self, fees_cfg):
        import os
        try:
            from py_clob_client.client import ClobClient  # noqa: F401
        except ImportError as exc:
            raise SystemExit(
                "Modo live: instala dependencias primero → pip install -r requirements.txt"
            ) from exc
        key = os.environ.get("POLYMARKET_PRIVATE_KEY")
        if not key:
            raise SystemExit(
                "Modo live: falta POLYMARKET_PRIVATE_KEY en el entorno (ver .env.example)."
            )
        from py_clob_client.client import ClobClient
        self.client = ClobClient(
            host=os.environ.get("POLYMARKET_HOST", "https://clob.polymarket.com"),
            key=key,
            chain_id=int(os.environ.get("POLYMARKET_CHAIN_ID", "137")),
        )
        self.client.set_api_creds(self.client.create_or_derive_api_creds())
        log.info("LiveExecutor conectado a Polymarket CLOB.")

    def execute(self, signal: Signal, quote: PredictionQuote, ts: float) -> Fill | None:
        # NOTA: el mapeo señal→token_id depende del mercado concreto que el
        # feed live haya descubierto; el feed adjunta el token en window_id.
        # Implementación intencionadamente conservadora: órdenes limit GTC
        # al precio de la señal, sin perseguir el libro.
        raise NotImplementedError(
            "Ejecución live: completa el mapeo de token_id con el feed de Polymarket "
            "(bot/feeds/polymarket.py) antes de operar con dinero real."
        )
