"""Carga y validación de config.json."""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AllocatorCfg:
    lead_symbol: str
    vol_low: float
    vol_high: float
    min_weight_short: float
    max_weight_short: float


@dataclass(frozen=True)
class MomentumLagCfg:
    enabled: bool
    min_edge: float
    take_profit_edge: float
    max_entry_price: float
    momentum_window_seconds: float
    lead_symbol: str
    cross_beta: float
    min_remaining_frac: float


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
    inventory_skew: float
    min_remaining_frac: float


@dataclass(frozen=True)
class RiskCfg:
    max_trade_pct: float
    max_trade_usd: float        # tope absoluto por orden (liquidez del libro)
    daily_loss_limit_pct: float
    max_drawdown_pct: float
    max_open_positions: int


@dataclass(frozen=True)
class FeesCfg:
    dynamic_fee_rate: float  # taker 2026: fee = notional × rate × p(1-p)
    maker_bps: float
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
    durations_minutes: list[int]
    allocator: AllocatorCfg
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
        durations_minutes=sorted(int(d) for d in _require(raw, "durations_minutes")),
        allocator=AllocatorCfg(**_require(raw, "allocator")),
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
    if not cfg.durations_minutes:
        raise ValueError("config.json: durations_minutes no puede estar vacío")
    return cfg
