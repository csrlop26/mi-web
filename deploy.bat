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

:: Repo temporal solo con el build, apunta a la rama gh-pages (NO a main).
:: main se queda como codigo fuente real: no lo pisamos en cada deploy.
git init
git add -A
git commit -m "Deploy: build output for GitHub Pages"
git branch -M gh-pages

echo Subiendo build a la rama gh-pages (main no se toca)...
git push -f https://github.com/csrlop26/mi-web gh-pages:gh-pages

cd ..
echo Despliegue finalizado con exito.
