import sqlite3 from 'sqlite3';
import axios from 'axios';
import * as cheerio from 'cheerio';
import moment from 'moment-timezone';

console.log('🔄 SINCRONIZANDO banco com dados REAIS do widget...');

// Conectar ao banco
const db = new sqlite3.Database('./data/alerts.db');

// Promisify
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function syncWithWidget() {
  try {
    // 1. ZERAR completamente a tabela de eventos
    console.log('🗑️ Zerando banco de dados...');
    await db.runAsync('DELETE FROM events');
    console.log('✅ Banco zerado!');
    
    // 2. Capturar dados REAIS do widget
    console.log('📊 Capturando dados do widget Investing.com...');
    
    const widgetUrl = 'https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=5&calType=week&timeZone=12&lang=1';
    
    const response = await axios.get(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    const events = [];
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
            currency: currency || 'USD'
          });
          
          console.log(`📊 ${eventName} - ${timeText} - ${impact} - ${currency}`);
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
    console.log(`🎯 ${events.length} eventos reais inseridos no banco.`);
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  } finally {
    db.close();
  }
}

syncWithWidget();