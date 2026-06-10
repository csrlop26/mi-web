"""Tipos de datos que circulan por el bot.

Todo lo que pasa entre módulos es uno de estos objetos inmutables:
ticks de precio spot, cotizaciones del mercado de predicción,
señales de las estrategias y ejecuciones (fills).
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field


class Side(enum.Enum):
    UP = "UP"      # el contrato SÍ ("la vela cierra en verde")
    DOWN = "DOWN"  # el contrato NO


class Action(enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


@dataclass(frozen=True)
class SpotTick:
    """Precio del activo subyacente (p. ej. BTC en Binance)."""
    symbol: str
    price: float
    ts: float  # epoch seconds (tiempo de mercado, no de pared)


@dataclass(frozen=True)
class PredictionQuote:
    """Estado del mercado up/down de Polymarket para una ventana de 15 min.

    Los precios son probabilidades implícitas en [0, 1].
    `up_bid/up_ask` cotizan el contrato UP; DOWN cuesta (1 - precio de UP).
    """
    symbol: str
    window_id: str          # identifica la ventana de 15 min
    open_price: float       # precio spot al abrir la ventana
    up_bid: float
    up_ask: float
    seconds_remaining: float
    ts: float

    @property
    def up_mid(self) -> float:
        return (self.up_bid + self.up_ask) / 2.0


@dataclass(frozen=True)
class WindowResolution:
    """Resolución de una ventana: ¿cerró en verde?"""
    symbol: str
    window_id: str
    up_won: bool
    close_price: float
    ts: float


@dataclass(frozen=True)
class Signal:
    """Orden que una estrategia quiere ejecutar."""
    strategy: str
    symbol: str
    window_id: str
    side: Side
    action: Action
    price: float       # probabilidad a la que está dispuesta a cruzar
    size_usd: float
    reason: str
    passive: bool = False  # True = orden maker (reposa en el libro, sin fee taker)


@dataclass
class Fill:
    """Ejecución confirmada por el ejecutor (paper o live)."""
    signal: Signal
    fill_price: float
    shares: float      # contratos: cada uno paga $1 si acierta
    fee_usd: float
    ts: float


@dataclass
class Position:
    """Posición abierta en un contrato de una ventana."""
    strategy: str
    symbol: str
    window_id: str
    side: Side
    shares: float
    cost_usd: float
    entries: list[Fill] = field(default_factory=list)

    @property
    def avg_price(self) -> float:
        return self.cost_usd / self.shares if self.shares else 0.0
