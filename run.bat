@echo off
title CryptoEconomicAlerts
color 0a
cls

echo.
echo ========================================
echo   CRYPTOECONOMICALERTS
echo ========================================
echo.
echo Iniciando servidor...
echo Dashboard: http://localhost:9025
echo.

node src/server-new.js

echo.
echo Servidor parado.
pause