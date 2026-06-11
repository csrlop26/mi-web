@echo off
REM ============================================================
REM  PolyEdge — lanzador principal
REM  Doble clic para arrancar. Ctrl+C para parar.
REM
REM  Lo que hace:
REM    1. Verifica Python
REM    2. Instala dependencias si faltan
REM    3. Lanza el bot en ventana separada (visible)
REM    4. Muestra el dashboard en esta ventana
REM    5. Al cerrar: para el bot y muestra resumen
REM ============================================================
setlocal enabledelayedexpansion
title PolyEdge — Dashboard
cd /d "%~dp0"

REM ── habilitar colores ANSI (Windows 10+) ────────────────────
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

echo.
echo  PolyEdge — Arrancando...
echo  ============================================================

REM ── localizar Python ────────────────────────────────────────
set PY=python
%PY% --version >nul 2>&1
if errorlevel 1 (
    set PY=py
    !PY! --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  [ERROR] Python no encontrado.
        echo  Instala Python 3.11+ desde https://python.org
        echo  y asegurate de marcar "Add to PATH".
        echo.
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%v in ('%PY% --version 2^>^&1') do echo  Python: %%v

REM ── dependencias ────────────────────────────────────────────
echo  Verificando dependencias...
%PY% -m pip install -q -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo  [AVISO] pip fallo — si hay errores al arrancar instala manualmente:
    echo          python -m pip install -r requirements.txt
)
echo  Dependencias OK.
echo.

REM ── carpeta de logs ─────────────────────────────────────────
if not exist logs mkdir logs

REM ── nombre del fichero de log (fecha de hoy) ────────────────
for /f %%i in ('%PY% -c "import datetime;print(datetime.date.today().strftime(\"%%Y%%m%%d\"))"') do set FECHA=%%i
set "LOGFILE=%~dp0logs\paper-%FECHA%.log"

echo  Log: %LOGFILE%
echo  ============================================================
echo.

REM ── lanzar bot en ventana separada (normal, no minimizada) ──
REM    cmd /c "bat args" — la ventana del bot muestra todo si hay crash
start "PolyEdge-BOT" cmd /c ""%~dp0_bot_loop.bat" "%LOGFILE%" "%PY%""

REM ── esperar a que el bot escriba las primeras lineas ─────────
timeout /t 4 /nobreak >nul

REM ── monitor en esta ventana (si existe y funciona) ───────────
if exist "%~dp0monitor.py" (
    %PY% "%~dp0monitor.py" "%LOGFILE%"
    if errorlevel 1 (
        echo  [AVISO] monitor.py fallo — mostrando log en directo:
        goto :tail_log
    )
) else (
    :tail_log
    echo  [Sin monitor] Mostrando log en directo. Ctrl+C para parar.
    echo  ============================================================
    %PY% -c "
import sys, time
f = open(sys.argv[1], 'r', encoding='utf-8', errors='replace')
f.seek(0, 2)
while True:
    line = f.readline()
    if line:
        print(line, end='', flush=True)
    else:
        time.sleep(0.3)
" "%LOGFILE%"
)

REM ── al salir, terminar el bot ────────────────────────────────
echo.
echo  Parando bot...
taskkill /fi "WINDOWTITLE eq PolyEdge-BOT" /f >nul 2>&1

echo.
echo  ============================================================
echo  Sesion terminada. Ultimo informe:
echo  ============================================================
%PY% -c "
import json, glob, os, sys
p = sys.argv[1]
fs = sorted(glob.glob(os.path.join(p, 'session_*.json')))
if not fs:
    print('  (sin informes de sesion aun)')
    sys.exit()
d = json.load(open(fs[-1]))
print(f'  Fichero  : {fs[-1]}')
print(f'  Retorno  : {d.get(\"retorno_pct\", 0):+.2f}%%')
print(f'  PnL      : {d.get(\"pnl_realizado\", 0):+.2f} USD')
print(f'  Trades   : {d.get(\"trades\", 0)}  (winrate {d.get(\"winrate_pct\", 0):.1f}%%)')
print(f'  Ventanas : {d.get(\"ventanas_resueltas\", 0)} resueltas')
" "%~dp0logs" 2>nul
echo  ============================================================
echo.
pause
endlocal
