# 🚀 Crypto Economic Alerts

Sistema completo de alertas econômicos via Telegram que monitora eventos financeiros importantes e envia notificações automáticas.

## 📊 Funcionalidades

- **Monitoramento de Eventos Econômicos**: CPI, PPI, NFP, FOMC, PCE, GDP, Jobless Claims
- **Bot Telegram Interativo**: Comandos completos para configurar alertas
- **Dashboard Web Local**: Interface visual em `localhost:3000`
- **Alertas Personalizados**: Configure notificações de 1 semana até 30 minutos antes
- **Sistema 24/7**: Roda continuamente com cron jobs
- **Banco SQLite Local**: Armazena eventos e histórico de mensagens

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: HTML/CSS/JS Vanilla
- **Telegram**: node-telegram-bot-api
- **Scheduling**: node-cron
- **Timezone**: moment-timezone

## 🚀 Instalação Rápida

### 1. Clone e Configure o Projeto

```bash
# Fazer download dos arquivos
# Navegar para a pasta do projeto
cd crypto-alerts-local

# Instalar dependências
npm install
```

### 2. Criar Bot no Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Envie `/newbot`
3. Nome: `Crypto Economic Alerts`
4. Username: `crypto_econ_alerts_bot` (deve ser único)
5. Copie o token fornecido

### 3. Configurar Comandos do Bot

No BotFather, envie `/setcommands` e cole:

```
start - Iniciar bot e obter ID
proximos - Ver próximos eventos econômicos
alertas - Ver seus alertas configurados
adicionar - Adicionar novo alerta
remover - Remover um alerta
ajuda - Ver todos os comandos
```

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```env
# Telegram
TELEGRAM_BOT_TOKEN=SEU_TOKEN_AQUI
TELEGRAM_CHAT_ID=SEU_CHAT_ID_AQUI

# Sistema
PORT=3000
NODE_ENV=production
TIMEZONE=America/Sao_Paulo
```

### 5. Iniciar o Sistema

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# 24/7 com PM2
npm install -g pm2
npm run pm2
pm2 save
pm2 startup
```

## 📱 Como Usar

### 1. Obter Chat ID

1. Abra o Telegram e procure seu bot
2. Envie `/start`
3. Copie o Chat ID mostrado
4. Adicione no arquivo `.env`

### 2. Configurar Alertas

- `/adicionar` - Selecionar evento e tempo de antecedência
- `/alertas` - Ver alertas configurados  
- `/proximos` - Ver próximos eventos
- `/ajuda` - Lista de comandos

### 3. Dashboard Web

Acesse `http://localhost:3000` para:

- Ver próximos eventos
- Monitorar alertas ativos
- Verificar histórico de mensagens
- Testar envio de alertas
- Acompanhar status do sistema

## 🎯 Eventos Monitorados

### Alto Impacto 🔴
- **CPI** (Consumer Price Index)
- **PPI** (Producer Price Index) 
- **NFP** (Non-Farm Payrolls)
- **FOMC** (Federal Open Market Committee)
- **PCE** (Personal Consumption Expenditures)

### Médio Impacto 🟡
- **GDP** (Gross Domestic Product)
- **Jobless Claims** (Pedidos de Seguro Desemprego)

## ⚙️ Configurações de Alerta

Escolha quando ser notificado:

- **1 semana antes** (168 horas)
- **3 dias antes** (72 horas)
- **1 dia antes** (24 horas)
- **12 horas antes**
- **1 hora antes**
- **30 minutos antes**

## 📁 Estrutura do Projeto

```
crypto-alerts-local/
├── src/
│   ├── server.js       # Servidor Express principal
│   ├── database.js     # Operações SQLite
│   ├── telegram.js     # Bot do Telegram
│   ├── scheduler.js    # Cron jobs e alertas
│   └── scraper.js      # Dados econômicos (mock)
├── public/
│   ├── index.html      # Interface web
│   ├── style.css       # Estilos CSS
│   └── script.js       # JavaScript frontend
├── data/
│   └── alerts.db       # Banco SQLite
├── logs/               # Arquivos de log
├── .env                # Variáveis de ambiente
└── package.json        # Dependências npm
```

## 🔧 Scripts Disponíveis

```bash
npm start      # Produção
npm run dev    # Desenvolvimento com nodemon
npm run pm2    # PM2 para 24/7
```

## 📊 API Endpoints

- `GET /api/events` - Próximos eventos
- `GET /api/alerts` - Alertas configurados
- `GET /api/logs` - Histórico de mensagens
- `POST /api/test-alert` - Testar alerta

## 🛡️ Comandos do Bot

| Comando | Descrição |
|---------|-----------|
| `/start` | Iniciar bot e obter Chat ID |
| `/proximos` | Ver próximos eventos econômicos |
| `/alertas` | Ver alertas configurados |
| `/adicionar` | Adicionar novo alerta |
| `/remover` | Remover alerta existente |
| `/ajuda` | Mostrar ajuda completa |

## 🔄 Sistema de Agendamento

- **Verificação de alertas**: A cada 5 minutos
- **Atualização de dados**: A cada hora
- **Resumo diário**: 8:00 AM (horário configurado)

## 📝 Logs e Monitoramento

- **Dashboard web**: Status em tempo real
- **Histórico completo**: Todas as mensagens enviadas
- **Status do sistema**: Indicadores visuais
- **Teste de conectividade**: Botão de teste no dashboard

## 🚨 Solução de Problemas

### Bot não responde
- Verifique o token no `.env`
- Confirme que o bot está ativo no BotFather

### Alertas não chegam
- Verifique o Chat ID no `.env`
- Teste com `/api/test-alert`

### Dashboard não carrega
- Confirme que a porta 3000 está livre
- Verifique se o servidor está rodando

## 🔧 Personalização

### Adicionar novos eventos
Edite `src/scraper.js` para incluir mais eventos econômicos.

### Modificar horários de alerta
Ajuste as opções em `src/telegram.js` no teclado inline.

### Customizar mensagens
Edite os templates em `src/telegram.js`.

## 📈 Melhorias Futuras

- [ ] Scraping real de dados econômicos
- [ ] Integração com APIs de notícias financeiras
- [ ] Gráficos de impacto histórico
- [ ] Sistema de grupos no Telegram
- [ ] Análise de sentimento pré-evento
- [ ] Alertas por email
- [ ] Mobile app complementar

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch de feature
3. Faça commit das mudanças
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para dúvidas e suporte:
- Abra uma issue no repositório
- Documente problemas encontrados
- Compartilhe sugestões de melhorias

---

**💡 Dica**: Mantenha o sistema rodando 24/7 usando PM2 para não perder nenhum evento importante!