@echo off
REM Bucle de resiliencia interno — llamado por start-bot.bat (no ejecutar directo)
setlocal enabledelayedexpansion
cd /d "%~dp0"
REM %~1 quita las comillas externas; sin esto la redireccion >> falla
REM (comillas dobladas) y la ventana queda negra sin escribir log.
set "LOGFILE=%~1"
set "PY=%~2"
set REINICIOS=0
if "%LOGFILE%"=="" set "LOGFILE=%~dp0logs\paper-manual.log"
if "%PY%"=="" set "PY=python"

echo [%date% %time%] === PolyEdge paper iniciado === >> "%LOGFILE%"

:run
echo [%date% %time%] arrancando bot (reinicio !REINICIOS!) >> "%LOGFILE%"
%PY% main.py --mode paper >> "%LOGFILE%" 2>&1
set CODIGO=%errorlevel%
echo [%date% %time%] bot termino con codigo %CODIGO% >> "%LOGFILE%"

if %CODIGO%==130 goto fin
if %CODIGO%==-1073741510 goto fin

set /a REINICIOS+=1
if !REINICIOS! GEQ 50 (
    echo [STOP] 50 reinicios: algo va muy mal. Revisa el log. >> "%LOGFILE%"
    goto fin
)
echo [%date% %time%] [AVISO] Reinicio !REINICIOS!/50 en 15 s... >> "%LOGFILE%"
timeout /t 15 /nobreak >nul
goto run

:fin
echo [%date% %time%] === Sesion terminada === >> "%LOGFILE%"
endlocal
