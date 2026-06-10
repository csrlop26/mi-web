"""Carga y validación de config.json."""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MomentumLagCfg:
    enabled: bool
    min_edge: float
    take_profit_edge: float
    min_seconds_remaining: float
    max_entry_price: float
    momentum_window_seconds: float
    lead_symbol: str
    cross_beta: float


@dataclass(frozen=True)
class MarketMakerCfg:
    enabled: bool
    base_spread: float
    min_spread: float
    max_spread: float
    vol_multiplier: float
    quote_size_usd: float
    max_inventory_usd: float
    requote_threshold: float
    min_seconds_remaining: float
    inventory_skew: float


@dataclass(frozen=True)
class RiskCfg:
    max_trade_pct: float
    daily_loss_limit_pct: float
    max_drawdown_pct: float
    max_open_positions: int


@dataclass(frozen=True)
class FeesCfg:
    taker_bps: float
    slippage_bps: float


@dataclass(frozen=True)
class SimCfg:
    speed: float
    session_windows: int
    annual_volatility: float
    jump_probability_per_min: float
    polymarket_lag_seconds: float
    alt_beta: float
    alt_lag_seconds: float
    seed: int | None


@dataclass(frozen=True)
class Config:
    bankroll: float
    symbols: list[str]
    window_minutes: int
    momentum_lag: MomentumLagCfg
    market_maker: MarketMakerCfg
    risk: RiskCfg
    fees: FeesCfg
    sim: SimCfg


def _require(d: dict[str, Any], key: str) -> Any:
    if key not in d:
        raise ValueError(f"config.json: falta la clave '{key}'")
    return d[key]


def load(path: str | pathlib.Path) -> Config:
    raw = json.loads(pathlib.Path(path).read_text())
    cfg = Config(
        bankroll=float(_require(raw, "bankroll")),
        symbols=list(_require(raw, "symbols")),
        window_minutes=int(_require(raw, "window_minutes")),
        momentum_lag=MomentumLagCfg(**_require(raw, "momentum_lag")),
        market_maker=MarketMakerCfg(**_require(raw, "market_maker")),
        risk=RiskCfg(**_require(raw, "risk")),
        fees=FeesCfg(**_require(raw, "fees")),
        sim=SimCfg(**_require(raw, "sim")),
    )
    if cfg.bankroll <= 0:
        raise ValueError("config.json: bankroll debe ser > 0")
    if not 0 < cfg.risk.max_trade_pct <= 0.25:
        raise ValueError("config.json: risk.max_trade_pct fuera de rango (0, 0.25]")
    if not cfg.symbols:
        raise ValueError("config.json: symbols no puede estar vacío")
    return cfg
