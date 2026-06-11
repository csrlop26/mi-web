@echo off
REM ============================================================
REM  PolyEdge — actualizador automático
REM  Doble clic para descargar la última versión del bot.
REM  Requiere: git (ya lo tienes instalado)
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set REPO=https://github.com/csrlop26/mi-web.git
set BRANCH=claude/crypto-bot-models-ynsjxm
set TMPDIR=%TEMP%\polyedge-update-%RANDOM%

echo.
echo  PolyEdge — Actualizador
echo  ============================================================

REM ── verificar git ───────────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] git no encontrado. Descarga en https://git-scm.com
    pause
    exit /b 1
)

REM ── descargar rama al directorio temporal ───────────────────
echo  Descargando ultima version desde GitHub...
git clone --depth 1 --branch %BRANCH% --no-tags --quiet "%REPO%" "%TMPDIR%"
if errorlevel 1 (
    echo.
    echo  [ERROR] No se pudo conectar a GitHub.
    echo  Verifica conexion a internet e intentalo de nuevo.
    echo.
    pause
    exit /b 1
)

REM ── copiar solo la carpeta crypto-bot a esta carpeta ────────
echo  Aplicando cambios...
robocopy "%TMPDIR%\crypto-bot" "%~dp0" /E /XO ^
    /XD __pycache__ .git logs ^
    /XF "*.pyc" "*.log" "*.json.bak" ^
    /NFL /NDL /NJH /NJS /NC /NS >nul

set ROBOCOPY_ERR=%errorlevel%

REM ── limpiar temp ────────────────────────────────────────────
rmdir /s /q "%TMPDIR%" >nul 2>&1

REM robocopy devuelve 0-3 como éxito (0=nada, 1=copiado, 2-3=extras)
if %ROBOCOPY_ERR% GTR 7 (
    echo  [ERROR] Error al copiar archivos ^(codigo %ROBOCOPY_ERR%^).
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo  Actualizacion completada.
echo.

REM ── mostrar que version quedo ───────────────────────────────
for /f %%i in ('git -C "%TMPDIR:~0,0%" ls-remote --heads "%REPO%" %BRANCH% 2^>nul') do (
    echo  Commit instalado: %%i
)

REM mostrar fecha del ultimo archivo modificado como proxy de version
for /f %%i in ('dir /b /o-d /a-d "%~dp0bot\feeds\polymarket.py" 2^>nul') do (
    echo  polymarket.py: %%~ti
)

echo  ============================================================
echo.
echo  Ahora puedes ejecutar start-bot.bat
echo.
pause
endlocal
