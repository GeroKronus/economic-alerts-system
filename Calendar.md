# Instruções para Desenvolver CryptoEconomicAlerts com Telegram

## Objetivo
Desenvolva uma aplicação local simples chamada "CryptoEconomicAlerts" que rode em minha máquina 24/7 para monitorar índices econômicos importantes e enviar alertas via Telegram.

## Requisitos do Sistema

### 1. Tecnologias
- Node.js com Express
- SQLite para banco de dados local
- Interface web simples (HTML/CSS/JS vanilla)
- Telegram Bot API (node-telegram-bot-api)
- Node-cron para agendamento

### 2. Estrutura de Pastas
```
crypto-alerts-local/
├── src/
│   ├── server.js       # Servidor principal Express
│   ├── scraper.js      # Busca dados econômicos
│   ├── scheduler.js    # Gerencia cron jobs
│   ├── telegram.js     # Bot do Telegram
│   └── database.js     # Operações SQLite
├── public/
│   ├── index.html      # Interface web
│   ├── style.css       # Estilos
│   └── script.js       # JavaScript frontend
├── data/
│   └── alerts.db       # Banco de dados SQLite
├── logs/               # Pasta para logs
├── .env                # Variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

## Funcionalidades Principais

### 1. Monitoramento de Índices Econômicos
Monitore os seguintes índices:
- **CPI (Consumer Price Index)** - Alto impacto
- **PPI (Producer Price Index)** - Alto impacto
- **NFP (Non-Farm Payrolls)** - Alto impacto
- **FOMC Meeting** - Alto impacto
- **PCE** - Alto impacto
- **GDP** - Médio impacto
- **Jobless Claims** - Médio impacto

### 2. Sistema de Alertas via Telegram
- Bot do Telegram com comandos interativos
- Configurar múltiplos alertas para cada evento
- Opções: 1 semana antes, 3 dias antes, 1 dia antes, 12 horas antes, 1 hora antes
- Alertas customizados (definir horas específicas)
- Templates de mensagem personalizáveis com emojis

### 3. Interface Web Local (localhost:3000)
- Dashboard com próximos eventos
- Configuração visual de alertas
- Histórico de mensagens enviadas
- Status do sistema e bot

### 4. Comandos do Bot Telegram
- `/start` - Iniciar e obter ID do chat
- `/proximos` - Ver próximos eventos
- `/alertas` - Ver alertas configurados
- `/adicionar` - Adicionar novo alerta
- `/remover` - Remover alerta
- `/ajuda` - Ver comandos disponíveis

## Implementação Detalhada

### 1. package.json
```json
{
  "name": "crypto-alerts-local",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "pm2": "pm2 start src/server.js --name crypto-alerts"
  },
  "dependencies": {
    "express": "^4.18.0",
    "node-cron": "^3.0.0",
    "node-telegram-bot-api": "^0.64.0",
    "sqlite3": "^5.1.0",
    "dotenv": "^16.0.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0",
    "winston": "^3.11.0",
    "moment-timezone": "^0.5.43"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### 2. Configuração do Bot no Telegram
```
INSTRUÇÕES PARA CRIAR O BOT:

1. Abra o Telegram e procure por @BotFather
2. Envie /newbot
3. Escolha um nome para o bot (ex: Crypto Economic Alerts)
4. Escolha um username (deve terminar com 'bot', ex: crypto_econ_alerts_bot)
5. Copie o token fornecido
6. Envie /mybots → selecione seu bot → Edit Bot → Edit Commands
7. Cole estes comandos:
   start - Iniciar bot e obter ID
   proximos - Ver próximos eventos econômicos
   alertas - Ver seus alertas configurados
   adicionar - Adicionar novo alerta
   remover - Remover um alerta
   ajuda - Ver todos os comandos
```

### 3. .env (exemplo)
```
# Telegram
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui

# API Keys (opcional)
ALPHA_VANTAGE_KEY=sua_chave_aqui

# Sistema
PORT=3000
NODE_ENV=production
TIMEZONE=America/Sao_Paulo
```

### 4. src/database.js
```javascript
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/alerts.db');

// Promisify para usar async/await
db.runAsync = promisify(db.run).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);

// Criar tabelas
export async function initDB() {
  // Tabela de eventos econômicos
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date DATETIME NOT NULL,
      impact TEXT,
      previous_value TEXT,
      forecast_value TEXT,
      actual_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de alertas configurados
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      hours_before INTEGER NOT NULL,
      message_template TEXT,
      is_active BOOLEAN DEFAULT 1,
      chat_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de mensagens enviadas
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS sent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      alert_id INTEGER,
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT,
      chat_id TEXT
    )
  `);

  console.log('✅ Banco de dados inicializado');
}

// Funções auxiliares
export async function saveEvent(event) {
  const { name, date, impact, previous_value, forecast_value } = event;
  
  // Verificar se já existe
  const existing = await db.getAsync(
    'SELECT id FROM events WHERE name = ? AND date = ?',
    [name, date]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE events SET impact = ?, previous_value = ?, forecast_value = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [impact, previous_value, forecast_value, existing.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO events (name, date, impact, previous_value, forecast_value) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, date, impact, previous_value, forecast_value]
    );
  }
}

export async function getUpcomingEvents() {
  return db.allAsync(`
    SELECT * FROM events 
    WHERE date > datetime('now') 
    ORDER BY date ASC 
    LIMIT 20
  `);
}

export async function getActiveAlerts() {
  return db.allAsync('SELECT * FROM alerts WHERE is_active = 1');
}

export async function saveAlert(alert) {
  const { event_type, hours_before, message_template, chat_id } = alert;
  return db.runAsync(
    `INSERT INTO alerts (event_type, hours_before, message_template, chat_id) 
     VALUES (?, ?, ?, ?)`,
    [event_type, hours_before, message_template, chat_id]
  );
}

export async function saveSentMessage(data) {
  const { event_id, alert_id, message, status, chat_id } = data;
  return db.runAsync(
    `INSERT INTO sent_messages (event_id, alert_id, message, status, chat_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [event_id, alert_id, message, status, chat_id]
  );
}

export async function getRecentLogs(limit = 50) {
  return db.allAsync(`
    SELECT * FROM sent_messages 
    ORDER BY sent_at DESC 
    LIMIT ?
  `, [limit]);
}
```

### 5. src/telegram.js
```javascript
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { saveAlert, getActiveAlerts, getUpcomingEvents } from './database.js';

dotenv.config();

class TelegramService {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.setupCommands();
  }

  setupCommands() {
    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const message = 
        `🚀 *Bem-vindo ao Crypto Economic Alerts!*\n\n` +
        `Seu Chat ID: \`${chatId}\`\n\n` +
        `Comandos disponíveis:\n` +
        `/proximos - Ver próximos eventos\n` +
        `/alertas - Ver alertas configurados\n` +
        `/adicionar - Adicionar novo alerta\n` +
        `/remover - Remover alerta\n` +
        `/ajuda - Ver esta mensagem\n\n` +
        `Configure seu Chat ID no arquivo .env para receber alertas automáticos!`;
      
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /proximos
    this.bot.onText(/\/proximos/, async (msg) => {
      const chatId = msg.chat.id;
      const events = await getUpcomingEvents();
      
      if (events.length === 0) {
        this.bot.sendMessage(chatId, '📅 Nenhum evento próximo encontrado.');
        return;
      }

      let message = '📊 *Próximos Eventos Econômicos:*\n\n';
      
      events.slice(0, 10).forEach(event => {
        const date = new Date(event.date);
        const emoji = event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢';
        
        message += `${emoji} *${event.name}*\n`;
        message += `📅 ${date.toLocaleString('pt-BR')}\n`;
        message += `📈 Previsão: ${event.forecast_value || 'N/A'}\n`;
        message += `📉 Anterior: ${event.previous_value || 'N/A'}\n\n`;
      });

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /alertas
    this.bot.onText(/\/alertas/, async (msg) => {
      const chatId = msg.chat.id;
      const alerts = await getActiveAlerts();
      const userAlerts = alerts.filter(a => a.chat_id === chatId.toString());
      
      if (userAlerts.length === 0) {
        this.bot.sendMessage(chatId, '🔔 Você não tem alertas configurados. Use /adicionar para criar um.');
        return;
      }

      let message = '🔔 *Seus Alertas Configurados:*\n\n';
      
      userAlerts.forEach((alert, index) => {
        message += `${index + 1}. *${alert.event_type}*\n`;
        message += `   ⏰ ${alert.hours_before} horas antes\n\n`;
      });

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /adicionar
    this.bot.onText(/\/adicionar/, (msg) => {
      const chatId = msg.chat.id;
      
      // Criar teclado inline com opções de eventos
      const keyboard = {
        inline_keyboard: [
          [
            { text: 'CPI', callback_data: 'add_CPI' },
            { text: 'PPI', callback_data: 'add_PPI' },
            { text: 'NFP', callback_data: 'add_NFP' }
          ],
          [
            { text: 'FOMC', callback_data: 'add_FOMC' },
            { text: 'PCE', callback_data: 'add_PCE' },
            { text: 'GDP', callback_data: 'add_GDP' }
          ],
          [
            { text: 'Jobless Claims', callback_data: 'add_JOBLESS' }
          ]
        ]
      };

      this.bot.sendMessage(
        chatId, 
        '📊 Selecione o evento para adicionar alerta:', 
        { reply_markup: keyboard }
      );
    });

    // Handler para callbacks do teclado inline
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const data = callbackQuery.data;
      const chatId = msg.chat.id;

      if (data.startsWith('add_')) {
        const eventType = data.replace('add_', '');
        
        // Teclado para selecionar tempo
        const timeKeyboard = {
          inline_keyboard: [
            [
              { text: '1 semana', callback_data: `time_${eventType}_168` },
              { text: '3 dias', callback_data: `time_${eventType}_72` }
            ],
            [
              { text: '1 dia', callback_data: `time_${eventType}_24` },
              { text: '12 horas', callback_data: `time_${eventType}_12` }
            ],
            [
              { text: '1 hora', callback_data: `time_${eventType}_1` },
              { text: '30 min', callback_data: `time_${eventType}_0.5` }
            ]
          ]
        };

        this.bot.editMessageText(
          `⏰ Quando você quer ser alertado sobre *${eventType}*?`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: timeKeyboard,
            parse_mode: 'Markdown'
          }
        );
      }

      if (data.startsWith('time_')) {
        const parts = data.split('_');
        const eventType = parts[1];
        const hours = parseFloat(parts[2]);

        // Salvar alerta
        await saveAlert({
          event_type: eventType,
          hours_before: hours,
          chat_id: chatId.toString(),
          message_template: null
        });

        this.bot.editMessageText(
          `✅ Alerta criado!\n\n` +
          `📊 Evento: *${eventType}*\n` +
          `⏰ Aviso: *${hours}* horas antes`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
      }

      // Responder ao callback para remover o "loading"
      this.bot.answerCallbackQuery(callbackQuery.id);
    });

    // Comando /ajuda
    this.bot.onText(/\/ajuda/, (msg) => {
      const chatId = msg.chat.id;
      const message = 
        `📚 *Central de Ajuda*\n\n` +
        `🤖 *Comandos disponíveis:*\n\n` +
        `/start - Obter seu Chat ID\n` +
        `/proximos - Listar próximos eventos econômicos\n` +
        `/alertas - Ver seus alertas configurados\n` +
        `/adicionar - Criar novo alerta\n` +
        `/remover - Remover alerta existente\n` +
        `/ajuda - Mostrar esta mensagem\n\n` +
        `💡 *Dicas:*\n` +
        `• Os alertas são enviados automaticamente\n` +
        `• Você pode ter múltiplos alertas para o mesmo evento\n` +
        `• Eventos de alto impacto são marcados com 🔴\n\n` +
        `📊 *Eventos monitorados:*\n` +
        `CPI, PPI, NFP, FOMC, PCE, GDP, Jobless Claims`;

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  async sendMessage(chatId, text) {
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      console.log('✅ Mensagem Telegram enviada');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAlert(chatId, event, alert) {
    const emoji = event.impact === 'high' ? '🚨' : '⚠️';
    const hoursText = alert.hours_before < 1 ? 
      `${alert.hours_before * 60} minutos` : 
      `${alert.hours_before} horas`;

    const message = 
      `${emoji} *ALERTA ECONÔMICO*\n\n` +
      `📊 *${event.name}*\n` +
      `⏰ Em *${hoursText}*\n` +
      `📅 ${new Date(event.date).toLocaleString('pt-BR')}\n\n` +
      `📈 Previsão: ${event.forecast_value || 'N/A'}\n` +
      `📉 Anterior: ${event.previous_value || 'N/A'}\n` +
      `⚡ Impacto: ${event.impact?.toUpperCase() || 'N/A'}\n\n` +
      `💡 Prepare-se para possível volatilidade!`;

    return this.sendMessage(chatId, message);
  }
}

export default new TelegramService();
```

### 6. src/scheduler.js
```javascript
import cron from 'node-cron';
import telegram from './telegram.js';
import { getActiveAlerts, getUpcomingEvents, saveSentMessage } from './database.js';
import moment from 'moment-timezone';

export function initScheduler() {
  // Verificar alertas a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔍 Verificando alertas...');
    await checkAlerts();
  });

  // Atualizar dados econômicos a cada hora
  cron.schedule('0 * * * *', async () => {
    console.log('📊 Atualizando dados econômicos...');
    // Implementar atualização de dados
  });

  // Enviar resumo diário às 8h
  cron.schedule('0 8 * * *', async () => {
    console.log('📅 Enviando resumo diário...');
    await sendDailySummary();
  });
}

async function checkAlerts() {
  const alerts = await getActiveAlerts();
  const events = await getUpcomingEvents();
  
  for (const event of events) {
    for (const alert of alerts) {
      if (!alert.chat_id) continue;
      
      const eventDate = moment(event.date);
      const now = moment();
      const hoursUntilEvent = eventDate.diff(now, 'hours', true);
      
      // Verificar se está na janela de tempo para enviar o alerta
      if (hoursUntilEvent <= alert.hours_before && 
          hoursUntilEvent > alert.hours_before - 0.08) { // ~5 minutos de janela
        
        // Verificar se já foi enviado
        const recentlySent = await wasRecentlySent(event.id, alert.id);
        if (recentlySent) continue;
        
        // Enviar alerta
        const result = await telegram.sendAlert(alert.chat_id, event, alert);
        
        // Registrar envio
        await saveSentMessage({
          event_id: event.id,
          alert_id: alert.id,
          message: `Alert sent for ${event.name}`,
          status: result.success ? 'sent' : 'failed',
          chat_id: alert.chat_id
        });
      }
    }
  }
}

async function wasRecentlySent(eventId, alertId) {
  // Verificar se foi enviado nas últimas 4 horas
  const recent = await db.getAsync(`
    SELECT id FROM sent_messages 
    WHERE event_id = ? AND alert_id = ? 
    AND sent_at > datetime('now', '-4 hours')
  `, [eventId, alertId]);
  
  return !!recent;
}

async function sendDailySummary() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  
  const todayEvents = await getEventsToday();
  if (todayEvents.length === 0) return;
  
  let message = '☀️ *Bom dia! Eventos de hoje:*\n\n';
  
  todayEvents.forEach(event => {
    const time = moment(event.date).format('HH:mm');
    const emoji = event.impact === 'high' ? '🔴' : '🟡';
    message += `${emoji} ${time} - *${event.name}*\n`;
  });
  
  message += '\n_Tenha um ótimo dia de trading!_';
  
  await telegram.sendMessage(chatId, message);
}
```

### 7. src/scraper.js (com dados mockados para teste)
```javascript
import axios from 'axios';
import moment from 'moment-timezone';
import { saveEvent } from './database.js';

// Dados mockados para desenvolvimento
const mockEvents = [
  {
    name: 'CPI',
    date: moment().add(2, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '3.1%',
    previous_value: '3.4%'
  },
  {
    name: 'FOMC Meeting',
    date: moment().add(5, 'days').hour(14).minute(0).toDate(),
    impact: 'high',
    forecast_value: '5.25%',
    previous_value: '5.50%'
  },
  {
    name: 'NFP',
    date: moment().add(7, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '200K',
    previous_value: '275K'
  }
];

export async function updateEconomicData() {
  console.log('📊 Atualizando dados econômicos...');
  
  // Em produção, implementar scraping real ou usar API
  // Por agora, usar dados mockados
  for (const event of mockEvents) {
    await saveEvent(event);
  }
  
  console.log('✅ Dados atualizados');
}

// Função para buscar dados reais (implementar depois)
export async function fetchRealData() {
  // Opção 1: Alpha Vantage API
  if (process.env.ALPHA_VANTAGE_KEY) {
    // Implementar chamadas API
  }
  
  // Opção 2: Scraping Investing.com
  // const response = await axios.get('...');
  // const $ = cheerio.load(response.data);
  // Parsear dados...
}
```

### 8. src/server.js (Principal)
```javascript
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, getUpcomingEvents, getActiveAlerts, getRecentLogs } from './database.js';
import { initScheduler } from './scheduler.js';
import { updateEconomicData } from './scraper.js';
import telegram from './telegram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rotas API
app.get('/api/events', async (req, res) => {
  try {
    const events = await getUpcomingEvents();
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await getActiveAlerts();
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await getRecentLogs();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test-alert', async (req, res) => {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const result = await telegram.sendMessage(
      chatId, 
      '🧪 *Teste de Alerta*\n\nSe você está vendo esta mensagem, o sistema está funcionando corretamente!'
    );
    res.json({ success: result.success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializar sistema
async function start() {
  try {
    // Criar pastas necessárias
    const fs = await import('fs');
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
    
    // Inicializar banco
    await initDB();
    
    // Carregar dados iniciais
    await updateEconomicData();
    
    // Iniciar agendador
    initScheduler();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n🚀 Sistema iniciado com sucesso!\n`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🤖 Bot Telegram: Ativo`);
      console.log(`⏰ Agendador: Rodando`);
      console.log(`\n💡 Dica: Abra o Telegram e envie /start para seu bot\n`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
}

start();
```

### 9. public/index.html (Interface Web)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Economic Alerts - Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Crypto Economic Alerts</h1>
            <div class="status-bar">
                <div class="status-item">
                    <span class="status-dot active"></span>
                    <span>Sistema Ativo</span>
                </div>
                <div class="status-item">
                    <span class="status-dot active"></span>
                    <span>Bot Telegram</span>
                </div>
            </div>
        </header>

        <main>
            <!-- Próximos Eventos -->
            <section class="card">
                <h2>📅 Próximos Eventos</h2>
                <div id="eventsList" class="events-list">
                    <div class="loading">Carregando...</div>
                </div>
            </section>

            <!-- Alertas Configurados -->
            <section class="card">
                <h2>🔔 Alertas Ativos</h2>
                <div id="alertsList" class="alerts-list">
                    <div class="loading">Carregando...</div>
                </div>
                <button class="btn-primary" onclick="testAlert()">
                    🧪 Testar Alerta
                </button>
            </section>

            <!-- Logs -->
            <section class="card">
                <h2>📝 Histórico de Mensagens</h2>
                <div id="logsList" class="logs-list">
                    <div class="loading">Carregando...</div>
                </div>
            </section>

            <!-- Instruções -->
            <section class="card instructions">
                <h2>🚀 Como Usar</h2>
                <ol>
                    <li>Abra o Telegram e procure seu bot</li>
                    <li>Envie <code>/start</code> para obter seu Chat ID</li>
                    <li>Adicione o Chat ID no arquivo <code>.env</code></li>
                    <li>Use <code>/adicionar</code> para configurar alertas</li>
                    <li>Receba notificações automáticas!</li>
                </ol>
            </section>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

### 10. public/style.css
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f0f;
    color: #ffffff;
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

h1 {
    font-size: 2rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.status-bar {
    display: flex;
    gap: 20px;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
}

.status-dot.active {
    background: #4caf50;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

main {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
}

.card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 25px;
    transition: all 0.3s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.card h2 {
    margin-bottom: 20px;
    font-size: 1.4rem;
}

.event-item, .alert-item, .log-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 10px;
    transition: all 0.2s ease;
}

.event-item:hover {
    background: rgba(255, 255, 255, 0.08);
}

.event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.event-name {
    font-weight: 600;
    font-size: 1.1rem;
}

.impact-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.impact-high {
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
}

.impact-medium {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
}

.event-details {
    color: #aaa;
    font-size: 0.9rem;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 15px;
    width: 100%;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.loading {
    text-align: center;
    color: #666;
    padding: 20px;
}

.instructions ol {
    margin-left: 20px;
}

.instructions li {
    margin-bottom: 10px;
}

.instructions code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
}

.log-item {
    font-size: 0.9rem;
}

.log-time {
    color: #666;
    font-size: 0.8rem;
}

.log-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    margin-left: 10px;
}

.log-status.sent {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
}

.log-status.failed {
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
}
```

### 11. public/script.js
```javascript
// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    loadAlerts();
    loadLogs();
    
    // Atualizar a cada 30 segundos
    setInterval(() => {
        loadEvents();
        loadLogs();
    }, 30000);
});

async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const data = await response.json();
        
        const container = document.getElementById('eventsList');
        
        if (data.events.length === 0) {
            container.innerHTML = '<p class="empty">Nenhum evento próximo</p>';
            return;
        }
        
        container.innerHTML = data.events.map(event => {
            const date = new Date(event.date);
            const impactClass = event.impact === 'high' ? 'impact-high' : 'impact-medium';
            
            return `
                <div class="event-item">
                    <div class="event-header">
                        <span class="event-name">${event.name}</span>
                        <span class="impact-badge ${impactClass}">
                            ${event.impact === 'high' ? 'Alto Impacto' : 'Médio Impacto'}
                        </span>
                    </div>
                    <div class="event-details">
                        📅 ${date.toLocaleString('pt-BR')}<br>
                        📈 Previsão: ${event.forecast_value || 'N/A'} | 
                        📉 Anterior: ${event.previous_value || 'N/A'}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
    }
}

async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const data = await response.json();
        
        const container = document.getElementById('alertsList');
        
        if (data.alerts.length === 0) {
            container.innerHTML = '<p class="empty">Nenhum alerta configurado</p>';
            return;
        }
        
        container.innerHTML = data.alerts.map(alert => {
            const hoursText = alert.hours_before < 1 ? 
                `${alert.hours_before * 60} minutos` : 
                `${alert.hours_before} horas`;
            
            return `
                <div class="alert-item">
                    <strong>${alert.event_type}</strong> - 
                    Alertar ${hoursText} antes
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
    }
}

async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        const container = document.getElementById('logsList');
        
        if (data.logs.length === 0) {
            container.innerHTML = '<p class="empty">Nenhuma mensagem enviada ainda</p>';
            return;
        }
        
        container.innerHTML = data.logs.slice(0, 10).map(log => {
            const date = new Date(log.sent_at);
            const statusClass = log.status === 'sent' ? 'sent' : 'failed';
            const statusText = log.status === 'sent' ? 'Enviado' : 'Falhou';
            
            return `
                <div class="log-item">
                    <span class="log-time">${date.toLocaleString('pt-BR')}</span>
                    <span class="log-status ${statusClass}">${statusText}</span>
                    <div>${log.message}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
    }
}

async function testAlert() {
    try {
        const response = await fetch('/api/test-alert', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Alerta de teste enviado! Verifique seu Telegram.');
        } else {
            alert('❌ Erro ao enviar alerta de teste.');
        }
    } catch (error) {
        alert('❌ Erro ao enviar alerta de teste.');
    }
}
```

## Instruções de Instalação e Uso

### 1. Criar o Bot no Telegram
1. Abra o Telegram e procure por @BotFather
2. Envie `/newbot` e siga as instruções
3. Copie o token fornecido

### 2. Configurar o Projeto
```bash
# Criar pasta do projeto
mkdir crypto-alerts-local
cd crypto-alerts-local

# Inicializar projeto
npm init -y

# Instalar dependências
npm install express node-cron node-telegram-bot-api sqlite3 dotenv axios cheerio winston moment-timezone

# Instalar nodemon para desenvolvimento
npm install -D nodemon
```

### 3. Configurar .env
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=será_obtido_após_start
PORT=3000
TIMEZONE=America/Sao_Paulo
```

### 4. Executar o Sistema
```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Com PM2 (24/7)
npm install -g pm2
pm2 start src/server.js --name crypto-alerts
pm2 save
pm2 startup
```

### 5. Configurar Alertas
1. Abra o Telegram e procure seu bot
2. Envie `/start` para obter seu Chat ID
3. Adicione o Chat ID no arquivo .env
4. Use `/adicionar` para configurar alertas
5. Acesse http://localhost:3000 para o dashboard

## Recursos Adicionais

- **Logs detalhados**: Salvos em ./logs/
- **Backup automático**: SQLite em ./data/
- **Dashboard web**: http://localhost:3000
- **Comandos do bot**: `/ajuda` no Telegram

## Melhorias Futuras
- Adicionar gráficos de impacto histórico
- Implementar scraping real de dados
- Adicionar mais eventos econômicos
- Sistema de grupos no Telegram
- Análise de sentimento pré-evento