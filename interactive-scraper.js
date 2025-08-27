import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('🌐 ABRINDO NAVEGADOR INTERATIVO para você filtrar Estados Unidos...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function interactiveCapture() {
  let browser;
  
  try {
    console.log('🚀 Abrindo navegador VISÍVEL...');
    browser = await puppeteer.launch({
      headless: false, // VISÍVEL para você interagir
      devtools: false,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      defaultViewport: null
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📊 Navegando para Investing.com...');
    await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Aguardando 5 segundos para carregar completamente...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('');
    console.log('🎯 AGORA É SUA VEZ!');
    console.log('👆 NO NAVEGADOR QUE ABRIU:');
    console.log('   1. Procure por FILTROS de países (ícones de bandeiras)');
    console.log('   2. DESMARQUE todos os países');
    console.log('   3. MARQUE apenas "Estados Unidos" 🇺🇸');
    console.log('   4. AGUARDE a tabela atualizar');
    console.log('   5. Pressione ENTER aqui no terminal quando terminar');
    console.log('   (Sem pressa - tome o tempo que precisar!)');
    console.log('');

    // Aguardar você pressionar Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    console.log('✅ Continuando... Capturando dados filtrados...');
    
    // Aguardar um pouco mais para garantir que os filtros foram aplicados
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const events = [];
      
      // Procurar tabelas com diferentes seletores
      const selectors = [
        'table tbody tr',
        '.js-event-item',
        '[data-event-datetime]',
        '#economicCalendarData tr',
        '.calendar-row'
      ];
      
      for (const selector of selectors) {
        const rows = document.querySelectorAll(selector);
        
        if (rows.length > 0) {
          console.log(`Usando seletor: ${selector} - ${rows.length} linhas`);
          
          rows.forEach((row, index) => {
            try {
              const cells = row.querySelectorAll('td');
              
              if (cells.length >= 6) {
                const timeText = cells[0]?.textContent?.trim() || '';
                const currency = cells[1]?.textContent?.trim() || '';
                const eventName = cells[3]?.textContent?.trim() || '';
                const actual = cells[4]?.textContent?.trim() || '';
                const forecast = cells[5]?.textContent?.trim() || '';
                const previous = cells[6]?.textContent?.trim() || '';
                
                // Filtrar apenas eventos com horário válido
                if (timeText.match(/\\d{1,2}:\\d{2}/) && eventName.length > 3) {
                  
                  // Determinar impacto
                  let impact = 'medium';
                  const highTerms = ['retail sales', 'cpi', 'ppi', 'jobless', 'employment', 'michigan', 'gdp', 'housing', 'industrial'];
                  if (highTerms.some(term => eventName.toLowerCase().includes(term))) {
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
            } catch (error) {
              // Ignorar erros de parsing
            }
          });
          
          if (events.length > 0) {
            break; // Se encontrou eventos, parar
          }
        }
      }
      
      return events;
    });

    console.log(`📊 ${events.length} eventos capturados após filtro`);
    
    if (events.length === 0) {
      console.log('❌ Nenhum evento encontrado. Tente ajustar os filtros.');
      console.log('🔍 Pressione Ctrl+C para sair ou Enter para tentar novamente');
      return false;
    }

    // Mostrar eventos encontrados
    console.log('📋 Eventos capturados:');
    events.slice(0, 10).forEach((event, i) => {
      console.log(`${i+1}. ${event.name} - ${event.time} - ${event.currency} - ${event.impact}`);
    });

    console.log('');
    console.log('💾 Salvando no banco de dados...');
    
    // Zerar banco
    await db.runAsync('DELETE FROM events');
    console.log('🗑️ Banco limpo');
    
    // Inserir eventos
    const now = moment.tz('America/New_York');
    let saved = 0;
    
    for (const event of events) {
      try {
        // Criar data
        const timeMatch = event.time.match(/(\\d{1,2}):(\\d{2})/);
        let eventDate = now.clone().add(1, 'hour');
        
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
        
        saved++;
      } catch (error) {
        console.log(`⚠️ Erro ao salvar: ${event.name}`);
      }
    }
    
    console.log(`✅ ${saved} eventos salvos no banco!`);
    console.log('🔄 Agora recarregue http://localhost:9025');
    console.log('');
    console.log('Pressione Enter para fechar o navegador...');
    
    // Aguardar confirmação antes de fechar
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    db.close();
    console.log('👋 Navegador fechado!');
  }
}

interactiveCapture();