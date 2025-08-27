@echo off
setlocal enabledelayedexpansion
title CryptoEconomicAlerts - Sistema de Alertas Econômicos v2.0
color 0a
cls

echo.
echo ========================================
echo   CRYPTOECONOMICALERTS v2.0
echo   Sistema de Alertas Economicos
echo ========================================
echo.
echo ^> Iniciando sistema...
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] ERRO: Node.js nao encontrado!
    echo [!] Por favor, instale o Node.js antes de continuar.
    echo [L] https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado: 
node --version

REM Verificar se as dependencias estao instaladas
if not exist "node_modules" (
    echo.
    echo [+] Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo [X] Erro ao instalar dependencias!
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas com sucesso!
    echo.
)

REM Verificar se arquivo .env existe
if not exist ".env" (
    echo [X] ERRO: Arquivo .env nao encontrado!
    echo [!] Configure suas credenciais do Telegram no arquivo .env
    echo.
    echo Exemplo de .env:
    echo TELEGRAM_BOT_TOKEN=seu_token_aqui
    echo TELEGRAM_CHAT_ID=seu_chat_id_aqui
    echo PORT=9025
    pause
    exit /b 1
)

REM Verificar se Tabela.sqlite existe
if exist "Tabela.sqlite" (
    echo [OK] Tabela.sqlite encontrada
) else (
    echo [!] Tabela.sqlite nao encontrada
    echo [+] Coloque seu arquivo Tabela.sqlite na pasta raiz para importar dados
)

echo.
echo ========================================
echo   CONFIGURACAO DO SISTEMA
echo ========================================
echo.
echo [DB] Fonte de dados: Tabela.sqlite
echo [BOT] Bot Telegram: Configurado
echo [TIME] Scheduler: Ativo (verificacao a cada 5min)
echo [WEB] Interface Web: Disponivel
echo [TZ] Fuso horario: GMT-3 (Brasil)
REM Verificar se a porta 9025 está em uso
netstat -an | findstr ":9025" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [!] ATENCAO: Porta 9025 ja esta em uso!
    echo.
    echo Opcoes:
    echo 1 - Parar processo existente e continuar
    echo 2 - Usar porta alternativa (9026)
    echo 3 - Cancelar
    echo.
    set /p choice=Escolha uma opcao (1-3): 
    
    if "!choice!"=="1" (
        echo.
        echo [STOP] Parando processo na porta 9025...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9025"') do (
            taskkill /PID %%a /F >nul 2>&1
        )
        echo [OK] Processo parado
        timeout /t 2 >nul
    ) else if "!choice!"=="2" (
        set PORT=9026
        echo [OK] Usando porta alternativa: 9026
    ) else (
        echo [X] Operacao cancelada
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo ========================================
echo.
if "%PORT%"=="" set PORT=9025
echo [WEB] Dashboard: http://localhost:%PORT%
echo [AUTO] Recarregamento automatico: Ativo
echo [24/7] Monitoramento: Continuo
echo.
echo [DICAS]
echo * Use a aba "Configurar Alertas" para gerenciar alertas
echo * Clique em "Testar Alerta" para verificar o Telegram
echo * Use "Recarregar" para atualizar dados da Tabela.sqlite
echo.
echo Pressione Ctrl+C para parar o servidor
echo ========================================
echo.

REM Definir a porta como variável de ambiente se necessário
if not "%PORT%"=="9025" (
    set NODE_PORT=%PORT%
)

REM Iniciar o servidor
node src/server-new.js

REM Se o servidor parar, mostrar mensagem
echo.
echo ========================================
echo   SERVIDOR PARADO
echo ========================================
echo.
echo [STOP] O servidor foi interrompido.
echo [INFO] Verifique os logs acima para possiveis erros.
echo.
pause