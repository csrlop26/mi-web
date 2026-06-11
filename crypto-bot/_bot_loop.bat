@echo off
REM ============================================================
REM  Bucle de resiliencia — llamado POR start-bot.bat
REM  No ejecutar directamente (usa start-bot.bat).
REM
REM  Reinicia el bot automaticamente si se cae.
REM  Para definitivamente con Ctrl+C o al llegar a 50 reinicios.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM %~1 y %~2 quitan las comillas externas que pasa start-bot.bat
set "LOGFILE=%~1"
set "PY=%~2"

REM valores por defecto si se ejecuta directamente por error
if "%LOGFILE%"=="" set "LOGFILE=%~dp0logs\paper-manual.log"
if "%PY%"==""      set "PY=python"

if not exist logs mkdir logs

echo [%date% %time%] ========================================== >> "%LOGFILE%"
echo [%date% %time%]  PolyEdge paper iniciado                   >> "%LOGFILE%"
echo [%date% %time%]  Log: %LOGFILE%                            >> "%LOGFILE%"
echo [%date% %time%] ========================================== >> "%LOGFILE%"

set REINICIOS=0

:run
echo [%date% %time%] Arrancando bot (reinicio !REINICIOS!) >> "%LOGFILE%"
"%PY%" main.py --mode paper >> "%LOGFILE%" 2>&1
set CODIGO=!errorlevel!
echo [%date% %time%] Bot termino con codigo !CODIGO! >> "%LOGFILE%"

REM 130 = Ctrl+C en Linux/Mac, -1073741510 (0xC000013A) = Ctrl+C en Windows
if !CODIGO!==130         goto :fin
if !CODIGO!==0           goto :fin
REM para positivos grandes (Windows Ctrl+C reporta como unsigned)
if !CODIGO! GEQ 3221226000 goto :fin

set /a REINICIOS+=1
if !REINICIOS! GEQ 50 (
    echo [%date% %time%] [STOP] 50 reinicios alcanzados. Revisa el log. >> "%LOGFILE%"
    goto :fin
)

echo [%date% %time%] Reinicio !REINICIOS!/50 en 10 s... >> "%LOGFILE%"
timeout /t 10 /nobreak >nul
goto :run

:fin
echo [%date% %time%] ========================================== >> "%LOGFILE%"
echo [%date% %time%]  Sesion terminada                          >> "%LOGFILE%"
echo [%date% %time%] ========================================== >> "%LOGFILE%"
endlocal
