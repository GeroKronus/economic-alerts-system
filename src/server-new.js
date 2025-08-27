import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, getUpcomingEvents, getActiveAlerts, getRecentLogs, clearAllAlerts, saveImpactAlert, getImpactAlerts, getAllEvents } from './database.js';
import { initScheduler } from './scheduler.js';
import SQLiteDataSource from './sqliteDataSource.js';
import telegram from './telegram.js';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NODE_PORT || process.env.PORT || 9025; // Porta configurável

// Instância da fonte de dados SQLite
const dataSource = new SQLiteDataSource();

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

app.get('/api/all-events', async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await getActiveAlerts();
    const impactAlerts = await getImpactAlerts();
    res.json({ 
      success: true, 
      alerts, 
      impactAlerts 
    });
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

// Endpoint para recarregar dados da Tabela.sqlite
app.post('/api/reload-data', async (req, res) => {
  try {
    console.log('🔄 Recarregando dados da Tabela.sqlite...');
    const result = await dataSource.importDataFromSQLite();
    
    if (result.success) {
      res.json({
        success: true,
        message: `${result.eventsImported} eventos recarregados da Tabela.sqlite`,
        eventsImported: result.eventsImported,
        breakdown: {
          high: result.highImpact,
          medium: result.mediumImpact,
          low: result.lowImpact
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao recarregar dados'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nova variável global para armazenar fuso horário do usuário
let userTimezoneOffset = -3; // Padrão Brasil (GMT-3)

// Rota para atualizar fuso horário do usuário
app.post('/api/update-timezone', (req, res) => {
  try {
    const { timezoneOffset } = req.body;
    userTimezoneOffset = timezoneOffset;
    global.userTimezoneOffset = timezoneOffset; // Atualizar variável global
    console.log(`🌍 Fuso horário do usuário atualizado para GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`);
    console.log(`⏰ Alertas serão enviados considerando horário local do usuário`);
    
    res.json({
      success: true,
      message: `Fuso horário configurado para GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`,
      timezoneOffset: timezoneOffset
    });
  } catch (error) {
    console.error('Erro ao atualizar fuso horário:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Função para converter horário de evento para fuso do usuário
function convertToUserTimezone(eventDate) {
  const eventTime = new Date(eventDate);
  // Aplicar offset do usuário (em horas)
  const userTime = new Date(eventTime.getTime() + (userTimezoneOffset * 60 * 60 * 1000));
  return userTime;
}

// Exportar para outros módulos
global.userTimezoneOffset = userTimezoneOffset;
global.convertToUserTimezone = convertToUserTimezone;

// Endpoint para salvar logs de debug
app.post('/api/debug-log', (req, res) => {
  try {
    const { message, timestamp, type } = req.body;
    const logMessage = `[${timestamp}] ${type}: ${message}\n`;
    
    fs.appendFileSync('./logs/debug.txt', logMessage);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para ler logs de debug
app.get('/api/debug-logs', (req, res) => {
  try {
    if (fs.existsSync('./logs/debug.txt')) {
      const logs = fs.readFileSync('./logs/debug.txt', 'utf8');
      const lines = logs.split('\n').filter(line => line.trim()).slice(-100); // Últimas 100 linhas
      res.json({ success: true, logs: lines });
    } else {
      res.json({ success: true, logs: [] });
    }
  } catch (error) {
    console.error('Erro ao ler logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para verificar status da Tabela.sqlite
app.get('/api/sqlite-status', async (req, res) => {
  try {
    const exists = dataSource.checkSQLiteFile();
    res.json({
      success: true,
      tabelaExists: exists,
      filePath: './Tabela.sqlite'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/create-impact-alert', async (req, res) => {
  try {
    const { impact_levels, hours_before } = req.body;
    const chat_id = process.env.TELEGRAM_CHAT_ID; // Usar Chat ID do .env
    
    let createdCount = 0;
    for (const impact_level of impact_levels) {
      await saveImpactAlert({
        impact_level,
        hours_before,
        chat_id
      });
      createdCount++;
    }
    
    res.json({
      success: true,
      message: `${createdCount} alertas de impacto criados`,
      createdCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/clear-alerts', async (req, res) => {
  try {
    const deletedCount = await clearAllAlerts();
    res.json({
      success: true,
      message: `${deletedCount} alertas removidos`,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/test-alert', async (req, res) => {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID; // Usar Chat ID do .env
    
    const message = `🧪 TESTE DE ALERTA

📅 Sistema de alertas econômicos funcionando!
🤖 Bot Telegram ativo
⏰ ${new Date().toLocaleString('pt-BR')}`;
    
    const result = await telegram.sendMessage(chatId, message);
    
    if (result.success) {
      res.json({ success: true, message: 'Alerta de teste enviado!' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicialização do servidor
async function startServer() {
  try {
    console.log('🚀 INICIALIZANDO SISTEMA DE ALERTAS ECONÔMICOS...');
    
    // 1. Inicializar banco de dados
    await initDB();
    
    // 2. Importar dados da Tabela.sqlite
    console.log('📊 Carregando dados da Tabela.sqlite...');
    const dataResult = await dataSource.initialize();
    
    if (dataResult.success) {
      console.log(`✅ ${dataResult.eventsImported} eventos carregados da Tabela.sqlite`);
      console.log(`🔴 ${dataResult.highImpact} eventos de alto impacto`);
      console.log(`🟡 ${dataResult.mediumImpact} eventos de médio impacto`);
      console.log(`⚪ ${dataResult.lowImpact} eventos de baixo impacto`);
    } else {
      console.log('⚠️ Erro ao carregar Tabela.sqlite:', dataResult.error);
      console.log('📋 Sistema continuará funcionando, mas sem dados iniciais');
    }
    
    // 3. Inicializar scheduler de alertas
    console.log('🚀 Iniciando scheduler de alertas...');
    initScheduler();
    
    // 4. Iniciar servidor web
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 SISTEMA INICIADO COM SUCESSO!');
      console.log('');
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log('🤖 Bot Telegram: Ativo');
      console.log('⏰ Agendador: Rodando');
      console.log('📋 Fonte de dados: Tabela.sqlite');
      console.log('');
      console.log('💡 Dica: Coloque seu arquivo Tabela.sqlite na pasta raiz');
      console.log('💡 Use POST /api/reload-data para recarregar dados');
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
  }
}

startServer();