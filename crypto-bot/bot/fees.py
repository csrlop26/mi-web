"""Modelo de comisiones de Polymarket (verificado contra docs 2026).

Fórmula oficial (docs.polymarket.com/trading/fees, desde abril 2026):

    fee_usd = C · feeRate · p·(1-p)        (C = contratos, p = precio)

La fee se cobra POR CONTRATO, no sobre el notional gastado. Con
feeRate = 0.072 el pico es 1.8¢ por contrato en p = 0.50. Expresada
sobre los dólares gastados (notional = C·p) equivale a feeRate·(1-p):
  · p=0.50 → 3.6% de lo gastado   (carísimo operar el centro)
  · p=0.90 → 0.72% de lo gastado  (favoritos casi gratis)
  · p=0.10 → 6.5% de lo gastado   (longshots prohibitivos)
Polymarket la diseñó así para matar el arbitraje de latencia en el
centro del libro. Las órdenes maker siguen a 0% (con rebates ~20%).

OJO: la fórmula ha cambiado 4 veces en 6 meses sin aviso. En live,
leer feeRateBps del objeto de mercado del CLOB en runtime.
"""
from __future__ import annotations

DEFAULT_FEE_RATE = 0.072  # cripto 5m/15m; pico 1.8¢/contrato en p=0.5


def taker_fee_per_share(price: float, fee_rate: float = DEFAULT_FEE_RATE) -> float:
    """Fee taker en USD por contrato al precio `price`.

    Es también el coste en unidades de probabilidad que un edge
    por-contrato debe superar para que la entrada sea rentable.
    """
    p = min(max(price, 0.0), 1.0)
    return fee_rate * p * (1.0 - p)
