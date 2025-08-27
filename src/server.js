import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, getUpcomingEvents, getActiveAlerts, getRecentLogs, clearAllAlerts, saveImpactAlert, getImpactAlerts } from './database.js';
import { initScheduler } from './scheduler.js';
import { updateEconomicData } from './scraper.js';
import telegram from './telegram.js';
import fs from 'fs';

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

// Endpoint para capturar dados EXATOS do widget visível na página
app.get('/api/widget-visible-data', async (req, res) => {
  try {
    console.log('🔍 Tentando capturar dados visíveis do widget...');
    
    // URL exata do widget como está no iframe
    const widgetUrl = 'https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=5&calType=week&timeZone=12&lang=1';
    
    const axios = (await import('axios')).default;
    const response = await axios.get(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/'
      },
      timeout: 10000
    });
    
    const cheerio = await import('cheerio');
    const $ = cheerio.load(response.data);
    
    const events = [];
    
    // Tentar diferentes seletores para capturar dados do widget
    $('tr, .event-row, [data-event-datetime]').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 4) {
        const timeText = cells.eq(0).text().trim();
        const currency = cells.eq(1).text().trim();
        const importance = cells.eq(2).text().trim();
        const eventName = cells.eq(3).text().trim();
        const actual = cells.eq(4).text().trim();
        const forecast = cells.eq(5).text().trim();
        const previous = cells.eq(6).text().trim();
        
        if (eventName && eventName.length > 2) {
          // Determinar impacto
          let impact = 'low';
          if ($row.find('.highVolatility').length > 0 || importance.includes('High')) {
            impact = 'high';
          } else if ($row.find('.moderateVolatility').length > 0 || importance.includes('Medium')) {
            impact = 'medium';
          }
          
          events.push({
            name: eventName,
            time: timeText,
            currency: currency || 'USD',
            impact: impact,
            actual_value: actual || null,
            forecast_value: forecast || '',
            previous_value: previous || '',
            source: 'widget_direct'
          });
        }
      }
    });
    
    console.log(`📊 Capturados ${events.length} eventos do widget`);
    
    res.json({ 
      success: true, 
      events: events, 
      total: events.length,
      source: 'widget_direct',
      url: widgetUrl
    });
    
  } catch (error) {
    console.error('❌ Erro ao capturar widget:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Não foi possível capturar dados do widget. Usando dados do banco como fallback.'
    });
  }
});

// Endpoint para debug - ver todos os eventos
app.get('/api/all-events', async (req, res) => {
  try {
    const { getAllEvents, getUpcomingEvents } = await import('./database.js');
    
    const allEvents = await getAllEvents();
    const futureEvents = await getUpcomingEvents();
    
    res.json({ 
      success: true, 
      allEvents, 
      futureEvents,
      totalAll: allEvents.length,
      totalFuture: futureEvents.length,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    // Buscar alertas de categorias de impacto
    const impactAlerts = await getImpactAlerts();
    // Buscar alertas tradicionais (para compatibilidade)
    const allAlerts = await getActiveAlerts();
    
    console.log('🔍 Backend - Impact alerts encontrados:', impactAlerts.length);
    console.log('📋 Backend - Detalhes dos impact alerts:', impactAlerts);
    
    res.json({ 
      success: true, 
      alerts: allAlerts,
      impactAlerts: impactAlerts
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

app.post('/api/test-alert', async (req, res) => {
  try {
    const { chat_id } = req.body;
    const chatId = chat_id || process.env.TELEGRAM_CHAT_ID;
    
    if (!chatId) {
      res.json({ success: false, error: 'Chat ID não fornecido ou TELEGRAM_CHAT_ID não configurado no .env' });
      return;
    }
    
    const result = await telegram.sendMessage(
      chatId, 
      '🧪 *Teste de Alerta*\n\nSe você está vendo esta mensagem, o sistema está funcionando corretamente!'
    );
    res.json({ success: result.success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint BLOQUEADO - usar apenas Tabela.sqlite
app.post('/api/refresh-data', async (req, res) => {
  res.json({ 
    success: false, 
    message: 'SISTEMA CONFIGURADO PARA USO EXCLUSIVO DA Tabela.sqlite. Execute: node import_real_data.js' 
  });
});

// Endpoint para criar alerta por categoria de impacto
app.post('/api/create-impact-alert', async (req, res) => {
  try {
    const { impact_levels, hours_before, chat_id } = req.body;
    
    if (!impact_levels || !hours_before || !chat_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: impact_levels, hours_before, chat_id' 
      });
    }
    
    console.log('🔔 Criando alertas por categoria:', { impact_levels, hours_before, chat_id });
    
    const results = [];
    for (const impact_level of impact_levels) {
      const alertId = await saveImpactAlert({
        impact_level,
        hours_before: parseFloat(hours_before),
        chat_id: chat_id.toString()
      });
      results.push({ impact_level, alertId });
    }
    
    res.json({ 
      success: true, 
      message: `Alertas configurados para ${impact_levels.join(' e ')} (${hours_before}h antes)`,
      results
    });
  } catch (error) {
    console.error('❌ Erro ao criar alertas de categoria:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para criar alerta (compatibilidade)
app.post('/api/create-alert', async (req, res) => {
  try {
    const { event_type, hours_before, chat_id } = req.body;
    
    if (!event_type || !hours_before || !chat_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: event_type, hours_before, chat_id' 
      });
    }
    
    const { saveAlert } = await import('./database.js');
    
    await saveAlert({
      event_type,
      hours_before: parseFloat(hours_before),
      chat_id: chat_id.toString(),
      message_template: null
    });
    
    res.json({ 
      success: true, 
      message: `Alerta criado para ${event_type} (${hours_before}h antes)` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para limpar todos os alertas
app.delete('/api/clear-alerts', async (req, res) => {
  try {
    console.log('🗑️ Requisição para limpar todos os alertas recebida');
    const deletedCount = await clearAllAlerts();
    console.log(`✅ ${deletedCount} alertas removidos`);
    
    res.json({ 
      success: true, 
      message: `${deletedCount} alertas removidos com sucesso`,
      deletedCount 
    });
  } catch (error) {
    console.error('❌ Erro ao limpar alertas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para ZERAR banco e preencher com dados REAIS do widget
app.post('/api/sync-with-widget', async (req, res) => {
  try {
    console.log('🔄 SINCRONIZANDO banco com dados REAIS do widget...');
    
    const { db } = await import('./database.js');
    
    // 1. ZERAR completamente a tabela de eventos
    console.log('🗑️ Zerando banco de dados...');
    await db.runAsync('DELETE FROM events');
    console.log('✅ Banco zerado!');
    
    // 2. Capturar dados REAIS do widget
    console.log('📊 Capturando dados do widget Investing.com...');
    
    const widgetUrl = 'https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=5&calType=week&timeZone=12&lang=1';
    
    const axios = (await import('axios')).default;
    const response = await axios.get(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/'
      },
      timeout: 15000
    });
    
    const cheerio = await import('cheerio');
    const $ = cheerio.load(response.data);
    
    const events = [];
    const moment = (await import('moment-timezone')).default;
    const now = moment.tz('America/New_York');
    
    // 3. Extrair eventos do HTML do widget
    $('tr').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 6) {
        const timeText = cells.eq(0).text().trim();
        const currency = cells.eq(1).text().trim();
        const importance = cells.eq(2).html() || '';
        const eventName = cells.eq(3).text().trim();
        const actual = cells.eq(4).text().trim();
        const forecast = cells.eq(5).text().trim();
        const previous = cells.eq(6).text().trim();
        
        if (eventName && eventName.length > 3 && timeText && timeText.includes(':')) {
          // Determinar impacto pelas estrelinhas
          let impact = 'low';
          const starCount = (importance.match(/bull/g) || []).length;
          if (starCount >= 3) impact = 'high';
          else if (starCount >= 2) impact = 'medium';
          
          // Criar data para hoje com o horário ET
          const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
          let eventDate = now.clone();
          
          if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            eventDate = now.clone().hour(hour).minute(minute).second(0);
            
            // Se já passou hoje, usar amanhã
            if (eventDate.isBefore(now)) {
              eventDate.add(1, 'day');
            }
          }
          
          events.push({
            name: eventName,
            date: eventDate.toISOString(),
            impact: impact,
            forecast_value: forecast || '',
            previous_value: previous || '',
            actual_value: actual || null,
            currency: currency || 'USD',
            source: 'investing_widget_real'
          });
        }
      }
    });
    
    // 4. Inserir eventos REAIS no banco
    console.log(`💾 Inserindo ${events.length} eventos reais no banco...`);
    
    for (const event of events) {
      await db.runAsync(
        `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [event.name, event.date, event.impact, event.forecast_value, event.previous_value, event.actual_value]
      );
    }
    
    console.log('✅ Sincronização completa!');
    
    res.json({
      success: true,
      message: `Banco sincronizado! ${events.length} eventos reais inseridos.`,
      eventsInserted: events.length,
      source: 'investing_widget_real'
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Erro ao sincronizar com widget'
    });
  }
});

// Inicializar sistema
async function start() {
  try {
    // Criar pastas necessárias
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
    
    // Inicializar banco
    await initDB();
    
    // USAR APENAS DADOS DA TABELA.SQLITE - NÃO ATUALIZAR AUTOMATICAMENTE
    console.log('📊 Sistema configurado para usar EXCLUSIVAMENTE Tabela.sqlite');
    
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