@echo off
title CryptoEconomicAlerts - PRODUÇÃO
color 0e
cls

echo.
echo ========================================
echo   CRYPTOECONOMICALERTS - PRODUÇÃO
echo   Sistema de Alertas Econômicos
echo ========================================
echo.

REM Verificar pré-requisitos
if not exist "node_modules" (
    echo ❌ Dependências não instaladas! Execute run-new.bat primeiro.
    pause
    exit /b 1
)

if not exist ".env" (
    echo ❌ Arquivo .env não encontrado!
    pause
    exit /b 1
)

if not exist "Tabela.sqlite" (
    echo ⚠️  Tabela.sqlite não encontrada - sistema funcionará sem dados iniciais
)

echo ✅ Pré-requisitos verificados
echo.
echo 🚀 Iniciando em modo PRODUÇÃO...
echo 📊 Dados: Tabela.sqlite
echo 🤖 Bot: Ativo
echo ⏰ Alertas: Automáticos
echo 🌐 Dashboard: http://localhost:9025
echo.
echo ========================================
echo   MONITORAMENTO ATIVO
echo ========================================
echo.

REM Iniciar em modo produção (sem logs detalhados)
set NODE_ENV=production
node src/server-new.js

echo.
echo ========================================
echo   SISTEMA PARADO
echo ========================================
pause