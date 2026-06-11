@echo off
REM ============================================================
REM  PolyEdge — actualizador automatico
REM  Doble clic para descargar la ultima version del bot.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set REPO=https://github.com/csrlop26/mi-web.git
set BRANCH=claude/crypto-bot-models-ynsjxm
set TMPDIR=%TEMP%\polyedge-%RANDOM%
set SRC=%TMPDIR%\crypto-bot

REM Destino = carpeta del propio update.bat (sin barra final para robocopy)
set "DEST=%~dp0"
if "%DEST:~-1%"=="\" set "DEST=%DEST:~0,-1%"

echo.
echo  PolyEdge -- Actualizador
echo  ============================================================

git --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] git no encontrado. Descarga en https://git-scm.com
    pause & exit /b 1
)

echo  Descargando desde GitHub...
git clone --depth 1 --branch %BRANCH% --no-tags --quiet "%REPO%" "%TMPDIR%"
if errorlevel 1 (
    echo  [ERROR] No se pudo conectar a GitHub. Verifica internet.
    rmdir /s /q "%TMPDIR%" >nul 2>&1
    pause & exit /b 1
)

if not exist "%SRC%" (
    echo  [ERROR] La carpeta crypto-bot no se encontro en el repo clonado.
    echo  Ruta esperada: %SRC%
    rmdir /s /q "%TMPDIR%" >nul 2>&1
    pause & exit /b 1
)

echo  Aplicando cambios...
echo    Origen : %SRC%
echo    Destino: %DEST%

robocopy "%SRC%" "%DEST%" /E /XO /XD __pycache__ .git logs /XF *.pyc *.log /NFL /NDL /NJH /NJS /NC /NS
set ERR=%errorlevel%

rmdir /s /q "%TMPDIR%" >nul 2>&1

if %ERR% GTR 7 (
    echo  [ERROR] robocopy fallo con codigo %ERR%.
    echo  Codigo 16 = permisos o ruta invalida. Prueba ejecutar como administrador.
    pause & exit /b 1
)

echo.
echo  ============================================================
echo  Actualizacion completada. Ejecuta start-bot.bat para arrancar.
echo  ============================================================
echo.
pause
endlocal
