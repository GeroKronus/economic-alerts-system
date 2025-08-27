import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('🎯 TENTATIVA FINAL: Captura REAL do Investing.com...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function captureRealData() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📊 Acessando página...');
    await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    console.log('⏳ Aguardando carregamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Extraindo dados...');
    const events = await page.evaluate(() => {
      const events = [];
      
      // Procurar por todas as linhas de tabela
      const rows = document.querySelectorAll('tr');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 6) {
          const timeText = cells[0]?.textContent?.trim() || '';
          const currency = cells[1]?.textContent?.trim() || '';
          const eventName = cells[3]?.textContent?.trim() || '';
          const actual = cells[4]?.textContent?.trim() || '';
          const forecast = cells[5]?.textContent?.trim() || '';
          const previous = cells[6]?.textContent?.trim() || '';
          
          // Filtrar apenas eventos com horário e nome válido
          if (timeText.match(/\d{1,2}:\d{2}/) && eventName.length > 3) {
            
            // Determinar impacto (assumir médio por padrão)
            let impact = 'medium';
            
            // Eventos importantes = alto impacto
            const highImpactTerms = [
              'retail sales', 'cpi', 'ppi', 'jobless', 'employment', 
              'michigan', 'gdp', 'housing starts', 'industrial production'
            ];
            
            if (highImpactTerms.some(term => eventName.toLowerCase().includes(term))) {
              impact = 'high';
            }
            
            events.push({
              name: eventName,
              time: timeText,
              currency: currency || 'USD',
              impact: impact,
              actual_value: actual || null,
              forecast_value: forecast || '',
              previous_value: previous || ''
            });
          }
        }
      }
      
      return events;
    });

    console.log(`📊 ${events.length} eventos encontrados`);
    
    if (events.length === 0) {
      console.log('❌ FALHA: Nenhum evento encontrado');
      
      // Debug: salvar HTML da página
      const content = await page.content();
      console.log('📄 Primeiros 500 caracteres da página:');
      console.log(content.substring(0, 500));
      
      return false;
    }

    // Mostrar alguns eventos encontrados
    console.log('📋 Primeiros eventos encontrados:');
    events.slice(0, 5).forEach(event => {
      console.log(`  • ${event.name} - ${event.time} - ${event.currency} - ${event.impact}`);
    });

    // Zerar banco e inserir dados
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('💾 Inserindo dados reais...');
    const now = moment.tz('America/New_York');
    let insertedCount = 0;
    
    for (const event of events.slice(0, 20)) { // Limitar a 20 eventos
      try {
        // Criar data para o evento
        const timeMatch = event.time.match(/(\d{1,2}):(\d{2})/);
        let eventDate = now.clone().add(1, 'hour'); // Padrão: 1 hora no futuro
        
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          eventDate = now.clone().hour(hour).minute(minute).second(0);
          
          if (eventDate.isBefore(now)) {
            eventDate.add(1, 'day');
          }
        }
        
        await db.runAsync(
          `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [event.name, eventDate.toISOString(), event.impact, event.forecast_value, event.previous_value, event.actual_value]
        );
        
        insertedCount++;
      } catch (dbError) {
        console.log(`⚠️ Erro ao inserir ${event.name}: ${dbError.message}`);
      }
    }
    
    console.log(`✅ SUCESSO! ${insertedCount} eventos reais inseridos no banco`);
    console.log('🔄 Agora recarregue http://localhost:9025 para ver os dados');
    
    return true;

  } catch (error) {
    console.error('❌ ERRO FINAL:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
    db.close();
  }
}

captureRealData();