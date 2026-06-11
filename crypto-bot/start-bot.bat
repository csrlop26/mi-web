@echo off
REM ============================================================
REM  PolyEdge — arranque nocturno con monitor en vivo
REM  Doble clic y dejar corriendo. Ctrl+C = para bot + monitor.
REM  Bot  → ventana minimizada; log en logs\paper-YYYYMMDD.log
REM  Display → esta ventana (dashboard ANSI en tiempo real)
REM ============================================================
setlocal enabledelayedexpansion
title PolyEdge — Dashboard
cd /d "%~dp0"

REM ── habilitar colores ANSI (Windows 10+) ────────────────────
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

REM ── localizar Python ────────────────────────────────────────
set PY=python
%PY% --version >nul 2>&1
if errorlevel 1 (
    set PY=py
    !PY! --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python no encontrado. Instala Python 3.11+ desde python.org
        pause
        exit /b 1
    )
)

REM ── dependencias (solo lo que falte) ────────────────────────
echo Comprobando dependencias...
%PY% -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo [AVISO] pip fallo; el modo paper necesita websockets y aiohttp.
    pause
)

if not exist logs mkdir logs

REM ── nombre del fichero de log ────────────────────────────────
for /f %%i in ('%PY% -c "import datetime;print(datetime.date.today().strftime('%%Y%%m%%d'))"') do set FECHA=%%i
set LOGFILE=%~dp0logs\paper-%FECHA%.log

REM ── lanzar bot en ventana minimizada ─────────────────────────
start "PolyEdge-BOT" /min "%~dp0_bot_loop.bat" "%LOGFILE%" %PY%

REM ── esperar a que el bot escriba las primeras líneas ─────────
timeout /t 3 /nobreak >nul

REM ── monitor en vivo en esta ventana ──────────────────────────
%PY% "%~dp0monitor.py" "%LOGFILE%"

REM ── al salir del monitor, terminar el bot si sigue vivo ──────
taskkill /fi "WINDOWTITLE eq PolyEdge-BOT" /f >nul 2>&1

echo.
echo ============================================================
echo  Sesion terminada. Resumen:
%PY% -c "import json,glob,os;p='%~dp0logs';fs=sorted(glob.glob(os.path.join(p,'session_*.json')));d=json.load(open(fs[-1])) if fs else {};print('  Ultimo informe :',fs[-1] if fs else 'ninguno');print('  Retorno        : %%+.2f%%%%  Trades: %%d  Winrate: %%.1f%%%%'%%(d.get('retorno_pct',0),d.get('trades',0),d.get('winrate_pct',0))) if d else None" 2>nul
echo ============================================================
pause
endlocal
