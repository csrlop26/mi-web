"""Modelo de comisiones de Polymarket (actualizado a 2026).

Desde marzo de 2026 los mercados cripto de 5/15 min cobran una taker fee
DINÁMICA que depende del precio del contrato:

    fee_usd = C · p · feeRate · p(1-p)        (C = contratos, p = precio)
            = notional · feeRate · p(1-p)     (notional = C·p, lo gastado)

Con feeRate = 0.072 el pico efectivo es 1.80% del notional en p = 0.50 y
cae simétricamente hacia los extremos (0.65% en p=0.90; ~0.3% en p=0.95).
Polymarket la introdujo precisamente para frenar el arbitraje de latencia;
modelarla bien (en vez de un 1.8% plano) es la diferencia entre operar y
quedarse mudo. Las órdenes maker siguen a 0% (y reciben rebates).
"""
from __future__ import annotations

DEFAULT_FEE_RATE = 0.072  # cripto 5m/15m; pico efectivo 1.8% en p=0.5


def taker_fee_rate(price: float, fee_rate: float = DEFAULT_FEE_RATE) -> float:
    """Fee taker como fracción del notional gastado, al precio `price`."""
    p = min(max(price, 0.0), 1.0)
    return fee_rate * p * (1.0 - p)
