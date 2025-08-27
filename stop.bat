@echo off
title Parar CryptoEconomicAlerts
color 0c

echo.
echo ========================================
echo   PARANDO CRYPTOECONOMICALERTS
echo ========================================
echo.

REM Verificar se há processo na porta 9025
netstat -an | findstr ":9025" >nul 2>&1
if %errorlevel% equ 0 (
    echo 🛑 Parando servidor na porta 9025...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9025"') do (
        echo Parando processo PID: %%a
        taskkill /PID %%a /F
    )
    echo ✅ Servidor parado com sucesso
) else (
    echo ℹ️  Nenhum servidor rodando na porta 9025
)

REM Verificar se há processo na porta 9026
netstat -an | findstr ":9026" >nul 2>&1
if %errorlevel% equ 0 (
    echo 🛑 Parando servidor na porta 9026...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9026"') do (
        echo Parando processo PID: %%a
        taskkill /PID %%a /F
    )
    echo ✅ Servidor parado com sucesso
) else (
    echo ℹ️  Nenhum servidor rodando na porta 9026
)

REM Parar qualquer processo Node.js relacionado ao CryptoEconomicAlerts
echo.
echo 🔍 Verificando outros processos Node.js...
tasklist | findstr "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Processos Node.js encontrados. Verificando...
    for /f "tokens=2" %%a in ('tasklist ^| findstr "node.exe"') do (
        echo Processo Node.js PID: %%a
    )
    echo.
    echo 💡 Se necessário, pare manualmente com: taskkill /IM node.exe /F
) else (
    echo ✅ Nenhum processo Node.js rodando
)

echo.
echo ========================================
echo   OPERAÇÃO CONCLUÍDA
echo ========================================
echo.
pause