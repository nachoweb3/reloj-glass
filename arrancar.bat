@echo off
rem Reloj glass - @nacho_web3
rem Doble clic para abrir el widget en el escritorio.

setlocal
cd /d "%~dp0"

set "ELECTRON_BIN=node_modules\electron\dist\electron.exe"

if exist "%ELECTRON_BIN%" (
  start "" "%ELECTRON_BIN%" .
  exit /b 0
)

echo.
echo  Preparando el widget por primera vez...
echo  Se descargara Electron, puede tardar un par de minutos.
echo.

call npm install
if errorlevel 1 (
  echo.
  echo  No se pudo instalar. Comprueba que Node.js esta instalado y tienes conexion.
  pause
  exit /b 1
)

rem El primer arranque descarga el binario de Electron.
call npm start

exit /b 0
