"""
PolyEdge — monitor de sesión en vivo.
Lee el log de paper trading y muestra un dashboard ANSI en la misma consola.
Sin dependencias externas; Python 3.11+ estándar.
Uso: python monitor.py logs/paper-YYYYMMDD.log
"""
from __future__ import annotations

import os
import re
import sys
import time
import msvcrt  # Windows only — detecta tecla sin bloquear

# ── ANSI ────────────────────────────────────────────────────────────────────
R  = "\033[0m"
B  = "\033[1m"           # bold
DIM= "\033[2m"
CY = "\033[96m"          # cyan
GN = "\033[92m"          # green
YL = "\033[93m"          # yellow
RD = "\033[91m"          # red
MG = "\033[95m"          # magenta
BL = "\033[94m"          # blue
WH = "\033[97m"          # white
BG_DARK = "\033[40m"     # fondo negro

CLR  = "\033[2J\033[H"   # limpiar pantalla
HIDE = "\033[?25l"       # ocultar cursor
SHOW = "\033[?25h"       # mostrar cursor

# ── Regex para las líneas del log ────────────────────────────────────────────
RE_STATUS = re.compile(
    r"equity=([0-9.]+)\s+cash=([0-9.]+)\s+pnl=([+-][0-9.]+)\s+"
    r"trades=(\d+)\s+win/loss=(\d+)/(\d+)\s+abiertas=(\d+)"
    r"(?:\s+(.*))?$"
)
RE_FILL = re.compile(
    r"FILL\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+@\s+([0-9.]+)\s+\$([0-9.]+)"
    r"\s+\(([^)]+)\)"
)
RE_REGIME = re.compile(
    r"r.gimen: vol=([0-9.]+).*?peso 5min=(\d+)%.*?15min=(\d+)%")
RE_EDGE = re.compile(
    r"(\w+) (\S+) \| modelo=([0-9.]+) mercado=([0-9.]+) \| "
    r"edge UP=([+-][0-9.]+) \(req ([0-9.]+)\) DOWN=([+-][0-9.]+)")
RE_KILL  = re.compile(r"KILL|kill.switch|HALT")
RE_REINICIO = re.compile(r"reinicio (\d+)/50")
RE_TS = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")


WIDTH = 70


def _ts_now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def _bar(val: float, max_val: float, width: int = 20,
         color_ok=GN, color_warn=YL, color_bad=RD) -> str:
    frac = max(0.0, min(1.0, val / max_val if max_val else 0.0))
    filled = int(frac * width)
    col = color_ok if frac < 0.5 else (color_warn if frac < 0.8 else color_bad)
    return col + "█" * filled + DIM + "░" * (width - filled) + R


def _pnl_color(v: float) -> str:
    return GN if v >= 0 else RD


def _header() -> str:
    lines = [
        f"{BG_DARK}{CY}{B}{'═' * WIDTH}{R}",
        f"{BG_DARK}{CY}{B}  {'PolyEdge  ·  Paper Trading  ·  Monitor en Vivo':^{WIDTH - 4}}{R}",
        f"{BG_DARK}{CY}{B}{'═' * WIDTH}{R}",
    ]
    return "\n".join(lines)


class State:
    def __init__(self, logfile: str):
        self.logfile = logfile
        self.equity = 0.0
        self.cash = 0.0
        self.pnl = 0.0
        self.trades = 0
        self.wins = 0
        self.losses = 0
        self.abiertas = 0
        self.flags = ""
        self.fills: list[str] = []       # últimos N fills (texto formateado)
        self.last_status_ts = "—"
        self.reinicios = 0
        self.vol_ann = 0.0
        self.w_short = 0.0
        self.regime = "—"
        self.last_edges: list[str] = []  # últimas 4 líneas de diagnóstico
        self.killed = False
        self.initial = 200.0             # bankroll por defecto
        self._pos = 0                    # posición de lectura en el fichero

    # ── leer líneas nuevas ──────────────────────────────────────────────────
    def poll(self) -> None:
        try:
            with open(self.logfile, "r", encoding="utf-8", errors="replace") as fh:
                fh.seek(self._pos)
                new_lines = fh.readlines()
                self._pos = fh.tell()
        except FileNotFoundError:
            return

        for raw in new_lines:
            line = raw.rstrip()
            self._parse(line)

    def _parse(self, line: str) -> None:
        # timestamp
        m_ts = RE_TS.search(line)
        ts = m_ts.group(1) if m_ts else _ts_now()

        # status periódico
        m = RE_STATUS.search(line)
        if m:
            self.equity  = float(m.group(1))
            self.cash    = float(m.group(2))
            self.pnl     = float(m.group(3))
            self.trades  = int(m.group(4))
            self.wins    = int(m.group(5))
            self.losses  = int(m.group(6))
            self.abiertas= int(m.group(7))
            self.flags   = (m.group(8) or "").strip()
            self.last_status_ts = ts
            if "KILL" in self.flags:
                self.killed = True
            return

        # fill
        m = RE_FILL.search(line)
        if m:
            strat, action, side, wid, price, usd, reason = m.groups()
            color = GN if action in ("BUY", "QUOTE_BID") else RD
            entry = (f"{DIM}{ts[-8:]}{R} {color}{B}{action:<10}{R} "
                     f"{WH}{strat:<12}{R} {CY}{wid}{R} "
                     f"@ {YL}{price}{R}  ${YL}{usd}{R}  {DIM}{reason[:20]}{R}")
            self.fills.append(entry)
            if len(self.fills) > 8:
                self.fills.pop(0)
            return

        # regime/vol
        m = RE_REGIME.search(line)
        if m:
            self.vol_ann = float(m.group(1))
            self.w_short = int(m.group(2)) / 100.0
            self.regime = ("alta-vol" if self.w_short > 0.6
                           else "baja-vol" if self.w_short < 0.4 else "normal")
            return

        # diagnóstico edge
        m = RE_EDGE.search(line)
        if m:
            sym, wid, model, mkt, edge_up, req, edge_down = m.groups()
            best = max(float(edge_up), float(edge_down))
            col = GN if best >= float(req) else (YL if best > 0 else RD)
            entry = (f"{DIM}{ts[-8:]}{R} {WH}{sym:<4}{R} "
                     f"modelo={CY}{model}{R} mercado={YL}{mkt}{R} "
                     f"UP={col}{edge_up}{R} DOWN={col}{edge_down}{R} "
                     f"{DIM}req {req}{R}")
            self.last_edges.append(entry)
            if len(self.last_edges) > 4:
                self.last_edges.pop(0)
            return

        # kill
        if RE_KILL.search(line):
            self.killed = True

        # reinicios
        m = RE_REINICIO.search(line)
        if m:
            self.reinicios = int(m.group(1))


def render(state: State, logfile: str, elapsed: float) -> str:
    s = state
    eq = s.equity if s.equity else s.initial
    pnl_col  = _pnl_color(s.pnl)
    ret_pct  = (eq / s.initial - 1) * 100 if s.initial else 0.0
    ret_col  = _pnl_color(ret_pct)
    wr = 100 * s.wins / max(s.wins + s.losses, 1)
    dd_frac  = max(0.0, -s.pnl / s.initial) if s.initial else 0.0  # aprox

    kill_banner = ""
    if s.killed:
        kill_banner = f"\n  {RD}{B}⛔  KILL-SWITCH ACTIVADO — sesión detenida{R}\n"

    hrs  = int(elapsed) // 3600
    mins = (int(elapsed) % 3600) // 60
    secs = int(elapsed) % 60

    # ── régimen vol ─────────────────────────────────────────────────────────
    vol_bar = _bar(s.vol_ann, 1.5, 18, GN, YL, RD)
    regime_color = CY if s.regime == "normal" else (YL if s.regime == "low" else MG)

    lines = [
        _header(),
        kill_banner,
        f"  {DIM}Log{R}  {BL}{logfile}{R}   {DIM}Monitor{R} {WH}{_ts_now()}{R}",
        f"  {DIM}Duración sesión{R} {WH}{hrs:02d}:{mins:02d}:{secs:02d}{R}"
        f"   {DIM}Reinicios{R} {YL if s.reinicios else GN}{s.reinicios}/50{R}",
        "",
        f"  {CY}{B}━━━  EQUITY & PnL  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{R}",
        f"  Equity    {B}{WH}${eq:>10.2f}{R}   "
        f"Retorno {ret_col}{B}{ret_pct:+.2f}%{R}",
        f"  PnL real  {pnl_col}{B}${s.pnl:>+10.2f}{R}   "
        f"Cash    {WH}${s.cash:.2f}{R}",
        f"  Drawdown aprox {_bar(dd_frac, 0.25, 18, GN, YL, RD)}  "
        f"{YL}{dd_frac*100:.1f}%{R}",
        "",
        f"  {CY}{B}━━━  OPERACIONES  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{R}",
        f"  Trades {WH}{B}{s.trades:>4}{R}   "
        f"Ganad {GN}{s.wins}{R}  Perd {RD}{s.losses}{R}   "
        f"Winrate {GN if wr>=55 else YL}{wr:.1f}%{R}",
        f"  Abiertas {WH}{s.abiertas:>3}{R}   "
        f"Última actualización {DIM}{s.last_status_ts[-8:]}{R}",
        "",
        f"  {CY}{B}━━━  RÉGIMEN DE VOLATILIDAD  ━━━━━━━━━━━━━━━━━━━━━━━━{R}",
        f"  Vol anual {vol_bar} {YL}{s.vol_ann:.3f}{R}",
        f"  Régimen   {regime_color}{B}{s.regime:<8}{R}   "
        f"Peso 5min {MG}{s.w_short:.2f}{R}  "
        f"Peso 15min {MG}{1-s.w_short:.2f}{R}",
        "",
    ]

    # ── últimos fills ────────────────────────────────────────────────────────
    lines.append(f"  {CY}{B}━━━  ÚLTIMOS FILLS  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{R}")
    if s.fills:
        for f in reversed(s.fills[-6:]):
            lines.append(f"  {f}")
    else:
        lines.append(f"  {DIM}(sin operaciones aún — esperando señales){R}")
    lines.append("")

    # ── diagnóstico edge ─────────────────────────────────────────────────────
    lines.append(f"  {CY}{B}━━━  DIAGNÓSTICO EDGE (últimas señales)  ━━━━━━━━━━━{R}")
    if s.last_edges:
        for e in reversed(s.last_edges):
            lines.append(f"  {e}")
    else:
        lines.append(f"  {DIM}(diagnóstico cada 60 s — esperando...){R}")
    lines.append("")

    lines.append(f"  {DIM}{'─' * (WIDTH - 4)}{R}")
    lines.append(f"  {DIM}Ctrl+C para parar el bot y cerrar la sesión{R}")

    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python monitor.py <logfile>")
        sys.exit(1)

    logfile = sys.argv[1]
    state   = State(logfile)
    started = time.time()

    # habilitar ANSI en Windows
    os.system("color")  # activa ANSI en consola Windows

    sys.stdout.write(HIDE)
    try:
        while True:
            state.poll()
            elapsed = time.time() - started
            out = CLR + render(state, logfile, elapsed)
            sys.stdout.write(out)
            sys.stdout.flush()

            # esperar ~2 s, salir si q/ESC/Ctrl+C
            deadline = time.time() + 2.0
            while time.time() < deadline:
                if msvcrt.kbhit():
                    ch = msvcrt.getch()
                    if ch in (b'q', b'Q', b'\x1b', b'\x03'):
                        raise KeyboardInterrupt
                time.sleep(0.1)

    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write(SHOW + "\n")
        print(f"\n{YL}Monitor cerrado.{R}")


if __name__ == "__main__":
    main()
