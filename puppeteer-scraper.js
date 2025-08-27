import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('🚀 TENTATIVA REAL: Capturando dados do Investing.com com Puppeteer...');

// Conectar ao banco
const db = new sqlite3.Database('./data/alerts.db');

db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function scrapeInvestingWithPuppeteer() {
  let browser;
  
  try {
    console.log('🌐 Abrindo navegador...');
    browser = await puppeteer.launch({
      headless: false, // Mostrar navegador para debug
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar como navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📊 Acessando Investing.com...');
    await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Aguardando carregamento da tabela...');
    await page.waitForTimeout(5000);

    // Tentar diferentes seletores para a tabela de eventos
    const events = await page.evaluate(() => {
      const events = [];
      
      // Tentar diferentes seletores
      const selectors = [
        '#economicCalendarData tr',
        '.js-event-item',
        '[data-event-datetime]',
        'table tbody tr',
        '.calendar-row'
      ];
      
      for (const selector of selectors) {
        const rows = document.querySelectorAll(selector);
        console.log(`Tentando seletor: ${selector} - ${rows.length} elementos`);
        
        if (rows.length > 0) {
          rows.forEach((row, index) => {
            try {
              const cells = row.querySelectorAll('td');
              
              if (cells.length >= 6) {
                const timeText = cells[0]?.textContent?.trim() || '';
                const currency = cells[1]?.textContent?.trim() || '';
                const importanceCell = cells[2];
                const eventName = cells[3]?.textContent?.trim() || '';
                const actual = cells[4]?.textContent?.trim() || '';
                const forecast = cells[5]?.textContent?.trim() || '';
                const previous = cells[6]?.textContent?.trim() || '';
                
                // Determinar impacto
                let impact = 'low';
                if (importanceCell) {
                  const importanceHTML = importanceCell.innerHTML;
                  const starCount = (importanceHTML.match(/bull/g) || []).length;
                  if (starCount >= 3) impact = 'high';
                  else if (starCount >= 2) impact = 'medium';
                }
                
                if (eventName && eventName.length > 3 && timeText.includes(':')) {
                  events.push({
                    name: eventName,
                    time: timeText,
                    currency: currency || 'USD',
                    impact: impact,
                    actual_value: actual || null,
                    forecast_value: forecast || '',
                    previous_value: previous || '',
                    selector_used: selector
                  });
                }
              }
            } catch (error) {
              console.log(`Erro ao processar linha ${index}:`, error.message);
            }
          });
          
          if (events.length > 0) {
            break; // Se encontrou eventos, pare de tentar outros seletores
          }
        }
      }
      
      return events;
    });

    console.log(`📊 ${events.length} eventos capturados`);
    
    if (events.length === 0) {
      console.log('❌ FALHA: Nenhum evento capturado');
      
      // Tentar salvar screenshot para debug
      await page.screenshot({ 
        path: 'investing-debug.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot salva como investing-debug.png');
      
      return false;
    }

    // Zerar banco e inserir dados reais
    console.log('🗑️ Zerando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('💾 Inserindo eventos reais...');
    const now = moment.tz('America/New_York');
    
    for (const event of events) {
      // Criar data para o evento
      const timeMatch = event.time.match(/(\d{1,2}):(\d{2})/);
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
      
      await db.runAsync(
        `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [event.name, eventDate.toISOString(), event.impact, event.forecast_value, event.previous_value, event.actual_value]
      );
      
      console.log(`✅ ${event.name} - ${event.time} - ${event.impact}`);
    }
    
    console.log('✅ SUCESSO! Dados reais capturados e inseridos no banco');
    return true;

  } catch (error) {
    console.error('❌ ERRO na captura:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
    db.close();
  }
}

scrapeInvestingWithPuppeteer();