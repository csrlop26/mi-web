@echo off
REM ============================================================
REM  PolyEdge - arranque nocturno (modo PAPER, dinero ficticio)
REM  Doble clic y dejar corriendo. Ctrl+C o cerrar ventana = parar.
REM  - Instala dependencias si faltan
REM  - Reinicia solo si el bot se cae (corte de red, error, etc.)
REM  - Guarda todo en logs\paper-YYYYMMDD.log + informes JSON en logs\
REM ============================================================
setlocal enabledelayedexpansion
title PolyEdge - paper trading
cd /d "%~dp0"

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

REM ── dependencias (solo instala lo que falte) ────────────────
echo [SETUP] Comprobando dependencias...
%PY% -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo [AVISO] pip fallo; el modo paper necesita websockets y aiohttp.
    pause
)

if not exist logs mkdir logs

REM ── fecha para el nombre del log (yyyymmdd) ─────────────────
for /f %%i in ('%PY% -c "import datetime;print(datetime.date.today().strftime('%%Y%%m%%d'))"') do set FECHA=%%i
set LOGFILE=logs\paper-%FECHA%.log

echo.
echo ============================================================
echo  PolyEdge PAPER - sesion nocturna
echo  Log en vivo : %LOGFILE%
echo  Informes    : logs\session_*.json
echo  Parar       : Ctrl+C  (o cerrar esta ventana)
echo ============================================================
echo.

REM ── bucle de resiliencia: si el bot cae, espera 15 s y rearranca ──
set REINICIOS=0
:run
echo [%date% %time%] arrancando bot (reinicio !REINICIOS!) >> "%LOGFILE%"
%PY% main.py --mode paper >> "%LOGFILE%" 2>&1
set CODIGO=%errorlevel%
echo [%date% %time%] bot termino con codigo %CODIGO% >> "%LOGFILE%"

REM Ctrl+C devuelve 130/STATUS_CONTROL_C_EXIT: no rearrancar
if %CODIGO%==130 goto fin
if %CODIGO%==-1073741510 goto fin

set /a REINICIOS+=1
if !REINICIOS! GEQ 50 (
    echo [STOP] 50 reinicios: algo va mal de verdad. Revisa %LOGFILE%
    goto fin
)
echo [AVISO] El bot se cayo (codigo %CODIGO%). Reinicio !REINICIOS!/50 en 15 s...
timeout /t 15 /nobreak >nul
goto run

:fin
echo.
echo Sesion terminada. Resumen de la noche:
%PY% -c "import json,glob;fs=sorted(glob.glob('logs/session_*.json'));d=json.load(open(fs[-1])) if fs else {};print('  Ultimo informe:',fs[-1] if fs else 'ninguno');print('  Retorno: %+.2f%%%%  Trades: %d  Winrate: %.1f%%%%'%(d.get('retorno_pct',0),d.get('trades',0),d.get('winrate_pct',0))) if d else None"
pause
endlocal
