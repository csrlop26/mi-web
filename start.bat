@echo off
echo ===================================================
echo Iniciando Proyecto AugustoCS - Web y Asistente Demo
echo ===================================================

echo [1/2] Iniciando backend del Asistente (puerto 5050)...
start "Backend Asistente" cmd /k "cd "Asistente demo" && npm start"

echo [2/2] Iniciando frontend web (puerto 3000)...
start "Frontend Web" cmd /k "npm run dev"

echo.
echo Todos los servicios se han iniciado en ventanas separadas.
echo Puedes cerrar esta ventana si lo deseas.
pause
