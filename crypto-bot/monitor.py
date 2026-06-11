"""
PolyEdge — monitor de sesión en vivo v2.
Lee el log del bot y muestra un dashboard ANSI en tiempo real.
Solo stdlib (Python 3.11+). Solo Windows (usa msvcrt).
Uso: python monitor.py <logfile>
"""
from __future__ import annotations

import os
import re
import sys
import time
import msvcrt

# ── ANSI ──────────────────────────────────────────────────────────────────────
R   = "\033[0m"
B   = "\033[1m"
DIM = "\033[2m"
CY  = "\033[96m"
GN  = "\033[92m"
YL  = "\033[93m"
RD  = "\033[91m"
MG  = "\033[95m"
BL  = "\033[94m"
WH  = "\033[97m"

CLR  = "\033[2J\033[H"
HIDE = "\033[?25l"
SHOW = "\033[?25h"

WIDTH = 72

# ── Regex ─────────────────────────────────────────────────────────────────────
RE_STATUS  = re.compile(
    r"equity=([0-9.]+)\s+cash=([0-9.]+)\s+pnl=([+-][0-9.]+)\s+"
    r"trades=(\d+)\s+win/loss=(\d+)/(\d+)\s+abiertas=(\d+)"
    r"(?:\s+res=(\d+))?(?:\s+(.*))?$")
RE_FILL    = re.compile(
    r"FILL\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+@\s+([0-9.]+)\s+\$([0-9.]+)"
    r"\s+\(([^)]+)\)")
RE_REGIME  = re.compile(
    r"r.gimen: vol=([0-9.]+).*?peso 5min=(\d+)%")
RE_EDGE    = re.compile(
    r"(\w+) (\S+) \| modelo=([0-9.]+) mercado=([0-9.]+) \| "
    r"edge UP=([+-][0-9.]+) \(req ([0-9.]+)\) DOWN=([+-][0-9.]+)")
RE_SPOT    = re.compile(r"SPOT\s+((?:\w+=[\d,.]+\s*)+)")
RE_BINOK   = re.compile(r"BINANCE-OK")
RE_BINERR  = re.compile(r"BINANCE-ERROR")
RE_POLYOK  = re.compile(r"POLY-OK\s+(\w+)/(\d+)m.*?bid=([0-9.]+)\s+ask=([0-9.]+).*?quedan=([0-9.]+)")
RE_POLYBOOK= re.compile(r"POLY-BOOK\s+(\w+)/(\d+)m\s+bid=([0-9.]+)\s+ask=([0-9.]+).*?quedan=([0-9.]+)")
RE_POLYWAIT= re.compile(r"POLY-WAIT\s+(\w+)/(\d+)m")
RE_KILL    = re.compile(r"KILL|kill.switch|HALT")
RE_REINICIO= re.compile(r"reinicio (\d+)/50")
RE_BANKROLL= re.compile(r"bankroll=\$([0-9.]+)")
RE_TS      = re.compile(r"^(\d{2}:\d{2}:\d{2})")


# ── Helpers ───────────────────────────────────────────────────────────────────
def _now_str() -> str:
    return time.strftime("%H:%M:%S")

def _bar(val: float, max_val: float, width: int = 18,
         c_ok=GN, c_warn=YL, c_bad=RD) -> str:
    frac   = max(0.0, min(1.0, val / max_val if max_val else 0.0))
    filled = int(frac * width)
    col    = c_ok if frac < 0.5 else (c_warn if frac < 0.8 else c_bad)
    return col + "█" * filled + DIM + "░" * (width - filled) + R

def _pnl_col(v: float) -> str:
    return GN if v >= 0 else RD


# ── Estado ────────────────────────────────────────────────────────────────────
class State:
    def __init__(self, logfile: str):
        self.logfile    = logfile
        self.equity     = 0.0
        self.cash       = 0.0
        self.pnl        = 0.0
        self.trades     = 0
        self.wins       = 0
        self.losses     = 0
        self.abiertas   = 0
        self.resueltas  = 0
        self.flags      = ""
        self.fills: list[str] = []
        self.last_status_ts   = "—"
        self.reinicios  = 0
        self.vol_ann    = 0.0
        self.w_short    = 0.5
        self.regime     = "—"
        self.last_edges: list[str] = []
        self.killed     = False
        self.initial    = 150.0   # se actualiza desde el log
        # precios en vivo
        self.prices: dict[str, float]  = {}
        self.price_ts:  dict[str, str] = {}
        # conexiones
        self.binance_ok = False
        self.binance_ts = "—"
        # mercados activos: (sym, dur) -> (bid, ask, quedan_s, last_ts)
        self.markets: dict[str, tuple] = {}
        # waiting markets
        self.waiting: set[str] = set()
        self._pos = 0

    def poll(self) -> None:
        try:
            with open(self.logfile, "r", encoding="utf-8", errors="replace") as fh:
                fh.seek(self._pos)
                lines = fh.readlines()
                self._pos = fh.tell()
        except FileNotFoundError:
            return
        for raw in lines:
            self._parse(raw.rstrip())

    def _parse(self, line: str) -> None:
        ts_m = RE_TS.search(line)
        ts   = ts_m.group(1) if ts_m else _now_str()

        # bankroll inicial
        m = RE_BANKROLL.search(line)
        if m:
            self.initial = float(m.group(1)); return

        # status periódico
        m = RE_STATUS.search(line)
        if m:
            self.equity   = float(m.group(1))
            self.cash     = float(m.group(2))
            self.pnl      = float(m.group(3))
            self.trades   = int(m.group(4))
            self.wins     = int(m.group(5))
            self.losses   = int(m.group(6))
            self.abiertas = int(m.group(7))
            if m.group(8):
                self.resueltas = int(m.group(8))
            self.flags    = (m.group(9) or "").strip()
            self.last_status_ts = ts
            if "KILL" in self.flags:
                self.killed = True
            return

        # fill
        m = RE_FILL.search(line)
        if m:
            strat, act, side, wid, px, usd, rsn = m.groups()
            col = GN if act in ("BUY", "QUOTE_BID") else RD
            entry = (f"{DIM}{ts}{R} {col}{B}{act:<6}{R} "
                     f"{WH}{strat:<12}{R} {CY}{side}/{wid[-6:]}{R} "
                     f"@ {YL}{px}{R}  ${YL}{usd}{R}  {DIM}{rsn[:22]}{R}")
            self.fills.append(entry)
            if len(self.fills) > 8:
                self.fills.pop(0)
            return

        # precios spot desde Binance
        m = RE_SPOT.search(line)
        if m:
            for part in m.group(1).split():
                if "=" in part:
                    sym, val = part.split("=", 1)
                    try:
                        self.prices[sym]   = float(val.replace(",", ""))
                        self.price_ts[sym] = ts
                    except ValueError:
                        pass
            self.binance_ok = True
            self.binance_ts = ts
            return

        # Binance conexión
        if RE_BINOK.search(line):
            self.binance_ok = True
            self.binance_ts = ts
            return
        if RE_BINERR.search(line):
            self.binance_ok = False
            return

        # Polymarket libro en vivo
        m = RE_POLYBOOK.search(line)
        if m:
            sym, dur, bid, ask, quedan = m.groups()
            key = f"{sym}/{dur}m"
            self.markets[key] = (float(bid), float(ask), float(quedan), ts)
            self.waiting.discard(key)
            return

        # POLY-OK (descubrimiento)
        m = RE_POLYOK.search(line)
        if m:
            sym, dur, bid, ask, quedan = m.groups()
            key = f"{sym}/{dur}m"
            self.markets[key] = (float(bid), float(ask), float(quedan), ts)
            self.waiting.discard(key)
            return

        # mercado buscando
        m = RE_POLYWAIT.search(line)
        if m:
            key = f"{m.group(1)}/{m.group(2)}m"
            if key not in self.markets:
                self.waiting.add(key)
            return

        # régimen vol
        m = RE_REGIME.search(line)
        if m:
            self.vol_ann = float(m.group(1))
            self.w_short = int(m.group(2)) / 100.0
            self.regime  = ("alta-vol" if self.w_short > 0.6
                            else "baja-vol" if self.w_short < 0.4
                            else "normal")
            return

        # edge diagnóstico
        m = RE_EDGE.search(line)
        if m:
            sym, wid, model, mkt, eup, req, edown = m.groups()
            best = max(float(eup), float(edown))
            col  = GN if best >= float(req) else (YL if best > 0 else RD)
            entry = (f"{DIM}{ts}{R} {WH}{sym:<4}{R} "
                     f"m={CY}{model}{R} M={YL}{mkt}{R} "
                     f"UP={col}{eup}{R} DW={col}{edown}{R} "
                     f"{DIM}≥{req}{R}")
            self.last_edges.append(entry)
            if len(self.last_edges) > 5:
                self.last_edges.pop(0)
            return

        if RE_KILL.search(line):
            self.killed = True
        m = RE_REINICIO.search(line)
        if m:
            self.reinicios = int(m.group(1))


# ── Render ────────────────────────────────────────────────────────────────────
def render(s: State, elapsed: float) -> str:
    eq       = s.equity if s.equity else s.initial
    ret_pct  = (eq / s.initial - 1) * 100 if s.initial else 0.0
    wr       = 100 * s.wins / max(s.wins + s.losses, 1)
    dd_frac  = max(0.0, -s.pnl / s.initial) if s.initial else 0.0
    hrs, rem = divmod(int(elapsed), 3600)
    mins, secs = divmod(rem, 60)

    kill_banner = ""
    if s.killed:
        kill_banner = f"\n  {RD}{B}⛔  KILL-SWITCH — sesión detenida  {R}\n"

    sep = f"  {CY}{B}"
    end_sep = R

    lines: list[str] = [
        f"{CY}{B}{'═' * WIDTH}{R}",
        f"{CY}{B}  {'PolyEdge  ·  Paper Trading  ·  Dashboard en Vivo':^{WIDTH-4}}{R}",
        f"{CY}{B}{'═' * WIDTH}{R}",
        kill_banner,
        f"  {DIM}{_now_str()}{R}   "
        f"Sesión {WH}{hrs:02d}:{mins:02d}:{secs:02d}{R}   "
        f"Log {DIM}{s.logfile}{R}   "
        f"Reinicios {YL if s.reinicios else GN}{s.reinicios}{R}",
        "",
    ]

    # ── CONEXIONES ──────────────────────────────────────────────────────────
    bin_col = GN if s.binance_ok else RD
    bin_txt = f"{bin_col}{'CONECTADO' if s.binance_ok else 'SIN SEÑAL'}{R}"
    lines += [
        f"{sep}━━━  CONEXIONES  {'━'*(WIDTH-20)}{end_sep}",
        f"  Binance   {bin_txt}  {DIM}(último tick: {s.binance_ts}){R}",
        f"  Polymarket: {_markets_line(s)}",
        "",
    ]

    # ── PRECIOS EN VIVO ─────────────────────────────────────────────────────
    if s.prices:
        price_parts = []
        for sym in ("BTC", "ETH", "SOL", "XRP"):
            if sym in s.prices:
                age = f"{DIM}({s.price_ts.get(sym,'?')}){R}"
                price_parts.append(
                    f"  {WH}{B}{sym}{R} {YL}{B}${s.prices[sym]:>10,.2f}{R} {age}")
        if price_parts:
            lines += [
                f"{sep}━━━  PRECIOS EN VIVO (Binance)  {'━'*(WIDTH-34)}{end_sep}",
            ] + price_parts + [""]
    else:
        lines += [
            f"{sep}━━━  PRECIOS EN VIVO  {'━'*(WIDTH-24)}{end_sep}",
            f"  {DIM}(esperando ticks de Binance…){R}",
            "",
        ]

    # ── LIBROS POLYMARKET ───────────────────────────────────────────────────
    lines.append(f"{sep}━━━  LIBROS POLYMARKET  {'━'*(WIDTH-25)}{end_sep}")
    if s.markets:
        for key, (bid, ask, quedan, ts_m) in sorted(s.markets.items()):
            spread  = ask - bid
            mid     = (bid + ask) / 2
            sp_col  = GN if spread < 0.05 else (YL if spread < 0.08 else RD)
            lines.append(
                f"  {WH}{key:<8}{R}  "
                f"bid={GN}{bid:.3f}{R} ask={RD}{ask:.3f}{R} "
                f"mid={YL}{mid:.3f}{R} spread={sp_col}{spread:.3f}{R}  "
                f"{DIM}quedan {quedan:.0f}s ({ts_m}){R}")
    else:
        lines.append(f"  {DIM}(buscando mercados activos…){R}")
    lines.append("")

    # ── EQUITY & PnL ────────────────────────────────────────────────────────
    lines += [
        f"{sep}━━━  EQUITY & PnL  {'━'*(WIDTH-21)}{end_sep}",
        f"  Equity  {B}{WH}${eq:>11,.2f}{R}   "
        f"Retorno {_pnl_col(ret_pct)}{B}{ret_pct:>+8.2f}%{R}",
        f"  PnL     {_pnl_col(s.pnl)}{B}${s.pnl:>+11.2f}{R}   "
        f"Cash    {WH}${s.cash:>8,.2f}{R}",
        f"  Drawdown {_bar(dd_frac, 0.25, 16, GN, YL, RD)} "
        f"{YL}{dd_frac*100:4.1f}%{R}",
        "",
    ]

    # ── OPERACIONES ─────────────────────────────────────────────────────────
    wr_col = GN if wr >= 55 else (YL if wr >= 45 else RD)
    lines += [
        f"{sep}━━━  OPERACIONES  {'━'*(WIDTH-20)}{end_sep}",
        f"  Trades {WH}{B}{s.trades:>4}{R}   "
        f"Ganad {GN}{s.wins}{R}  Perd {RD}{s.losses}{R}   "
        f"Winrate {wr_col}{B}{wr:.1f}%{R}   "
        f"Abiertas {WH}{s.abiertas}{R}   "
        f"Resueltas {GN}{s.resueltas}{R}",
        f"  Último status {DIM}{s.last_status_ts}{R}",
        "",
    ]

    # ── VOLATILIDAD / RÉGIMEN ───────────────────────────────────────────────
    if s.vol_ann > 0:
        rcol = CY if s.regime == "normal" else (MG if "alta" in s.regime else BL)
        lines += [
            f"{sep}━━━  VOLATILIDAD & RÉGIMEN  {'━'*(WIDTH-29)}{end_sep}",
            f"  Vol anual {_bar(s.vol_ann, 1.5)} {YL}{s.vol_ann:.3f}{R}",
            f"  Régimen {rcol}{B}{s.regime:<10}{R}  "
            f"5min {MG}{s.w_short:.0%}{R}  15min {MG}{1-s.w_short:.0%}{R}",
            "",
        ]

    # ── ÚLTIMOS FILLS ───────────────────────────────────────────────────────
    lines.append(f"{sep}━━━  ÚLTIMOS FILLS  {'━'*(WIDTH-22)}{end_sep}")
    if s.fills:
        for f in reversed(s.fills[-6:]):
            lines.append(f"  {f}")
    else:
        lines.append(f"  {DIM}(sin operaciones aún){R}")
    lines.append("")

    # ── DIAGNÓSTICO EDGE ────────────────────────────────────────────────────
    lines.append(f"{sep}━━━  EDGE DIAGNÓSTICO  {'━'*(WIDTH-24)}{end_sep}")
    if s.last_edges:
        for e in reversed(s.last_edges):
            lines.append(f"  {e}")
    else:
        lines.append(f"  {DIM}(diagnóstico cada 60s — esperando…){R}")
    lines.append("")

    lines += [
        f"  {DIM}{'─' * (WIDTH-4)}{R}",
        f"  {DIM}[q] o Ctrl+C → parar bot y cerrar sesión{R}",
    ]
    return "\n".join(lines)


def _markets_line(s: State) -> str:
    parts = []
    # mercados activos
    for key in sorted(s.markets):
        parts.append(f"{GN}{key}{R}")
    # mercados buscando
    for key in sorted(s.waiting):
        if key not in s.markets:
            parts.append(f"{YL}{key}?{R}")
    if not parts:
        return f"{RD}sin mercados activos{R}"
    return "  ".join(parts)


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python monitor.py <logfile>")
        sys.exit(1)

    logfile = sys.argv[1]
    state   = State(logfile)
    # leer bankroll desde config.json si existe
    try:
        import json, pathlib
        cfg = pathlib.Path(__file__).parent / "config.json"
        state.initial = json.loads(cfg.read_text()).get("bankroll", 200.0)
    except Exception:
        pass

    started = time.time()
    os.system("color")  # habilitar ANSI en Windows

    sys.stdout.write(HIDE)
    try:
        while True:
            state.poll()
            out = CLR + render(state, time.time() - started)
            sys.stdout.write(out)
            sys.stdout.flush()

            deadline = time.time() + 2.0
            while time.time() < deadline:
                if msvcrt.kbhit():
                    ch = msvcrt.getch()
                    if ch in (b"q", b"Q", b"\x1b", b"\x03"):
                        raise KeyboardInterrupt
                time.sleep(0.1)

    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write(SHOW + "\n")
        print(f"\n{YL}Monitor cerrado.{R}")


if __name__ == "__main__":
    main()
