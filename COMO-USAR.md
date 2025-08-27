# 🚀 CryptoEconomicAlerts v2.0 - Como Usar

## 📋 Pré-requisitos

- ✅ **Node.js** instalado (v16 ou superior)
- ✅ **Bot do Telegram** configurado
- ✅ **Arquivo .env** com suas credenciais
- ✅ **Tabela.sqlite** com dados econômicos (opcional)

## 🏃‍♂️ Como Iniciar

### Opção 1: Modo Desenvolvimento (Recomendado)
```bash
# Duplo clique no arquivo:
run-new.bat
```

### Opção 2: Modo Produção
```bash
# Para uso 24/7:
run-production.bat
```

### Opção 3: Linha de Comando
```bash
# Instalar dependências (primeira vez)
npm install

# Iniciar servidor
node src/server-new.js
```

## 🔧 Configuração

### 1. Arquivo .env
Crie um arquivo `.env` na pasta raiz com:
```env
# Telegram
TELEGRAM_BOT_TOKEN=7975587479:AAH9H_Y3am8JwVDc-Nmpzdpy_RnJWV9L6Is
TELEGRAM_CHAT_ID=7336659270

# Sistema
PORT=9025
NODE_ENV=production
TIMEZONE=America/Sao_Paulo
```

### 2. Dados Econômicos
- Coloque seu arquivo `Tabela.sqlite` na pasta raiz
- O sistema importará automaticamente os dados
- Use o botão "🔄 Recarregar" para atualizar

## 🎯 Funcionalidades

### 📊 Dashboard Web
- **URL**: http://localhost:9025
- **Abas disponíveis**:
  - 📅 Calendário Econômico
  - ⚠️ Configurar Alertas  
  - 📊 Gerenciar Dados
  - 📜 Histórico

### 🔔 Sistema de Alertas
1. **Configure alertas** por nível de impacto:
   - 🔴 Alto Impacto
   - 🟡 Médio Impacto
   - ⚪ Baixo Impacto

2. **Defina antecedência**:
   - 30 minutos antes
   - 1 hora antes
   - 2 horas antes
   - 12 horas antes
   - 1 dia antes

3. **Teste o sistema**:
   - Clique em "🧪 Testar Alerta"
   - Verifique se recebe no Telegram

### 📱 Bot Telegram
Comandos disponíveis:
- `/start` - Obter informações e Chat ID
- `/proximos` - Ver próximos eventos
- `/alertas` - Ver alertas configurados
- `/ajuda` - Central de ajuda

## 🔄 Atualizando Dados

### Automático
- O sistema atualiza a cada hora
- Alertas verificados a cada 5 minutos

### Manual
- Clique em "🔄 Recarregar" na interface
- Ou use: `POST /api/reload-data`

## 🛠️ Solução de Problemas

### ❌ "Node.js não encontrado"
- Instale o Node.js: https://nodejs.org/

### ❌ "Arquivo .env não encontrado"
- Crie o arquivo .env com suas credenciais

### ❌ "Não recebo alertas no Telegram"
1. Verifique se o bot está funcionando: `/start`
2. Confirme o Chat ID no .env
3. Teste com "🧪 Testar Alerta"

### ❌ "Dados antigos no calendário"
1. Atualize sua Tabela.sqlite
2. Clique em "🔄 Recarregar"
3. Aguarde a importação

## 📈 Monitoramento

### Logs do Sistema
- Console do Windows mostra logs detalhados
- Erros e sucessos são reportados
- Status de importação é exibido

### Status do Bot
- ✅ Online: Bot funcionando
- ❌ Erro: Verificar token/conexão

## 🎯 Dicas de Uso

1. **Primeira execução**: Use `run-new.bat`
2. **Deixar 24/7**: Use `run-production.bat`  
3. **Testar sempre**: Use "🧪 Testar Alerta"
4. **Atualizar dados**: Coloque nova Tabela.sqlite e clique "🔄 Recarregar"
5. **Monitorar**: Deixe o console aberto para ver logs

## 🔗 URLs Importantes

- **Dashboard**: http://localhost:9025
- **API Status**: http://localhost:9025/api/events
- **API Alertas**: http://localhost:9025/api/alerts

---

**🤖 Sistema desenvolvido para monitoramento 24/7 de eventos econômicos com alertas automáticos via Telegram.**