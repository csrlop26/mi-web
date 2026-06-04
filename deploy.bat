@echo off
cd /d "%~dp0"
echo Instalando dependencias...
call npm.cmd install
if %ERRORLEVEL% neq 0 (
  echo Error durante npm install. Abortando.
  exit /b %ERRORLEVEL%
)

echo Compilando el proyecto...
call npm.cmd run build
if %ERRORLEVEL% neq 0 (
  echo Error durante npm run build. Abortando.
  exit /b %ERRORLEVEL%
)

echo Preparando despliegue de la carpeta 'disc'...
cd disc

:: Creamos un repo nuevo solo dentro de 'disc'
git init
git add -A
git commit -m "Deploy V2 - Portfolio (Build files only)"
git branch -M main

echo Subiendo cambios a GitHub (limpiando el resto)...
git push -f https://github.com/csrlop26/mi-web main:main

cd ..
echo Despliegue finalizado con exito.
