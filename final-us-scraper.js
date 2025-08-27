import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('🇺🇸 CAPTURA FINAL: Dados dos Estados Unidos...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function captureFinalUSData() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🎯 Configure o filtro para ESTADOS UNIDOS e pressione ENTER...');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('📊 Capturando dados filtrados...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const events = [];
      
      // Usar os seletores que funcionaram no debug
      const rows = document.querySelectorAll('.js-event-item, [data-event-datetime]');
      
      console.log(`Processando ${rows.length} linhas...`);
      
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
            
            // Filtrar apenas eventos com horário válido e nome
            if (timeText.match(/\d{1,2}:\d{2}/) && eventName.length > 3) {
              
              // Determinar impacto baseado no nome do evento
              let impact = 'medium';
              const eventLower = eventName.toLowerCase();
              
              const highImpactTerms = [
                'retail sales', 'cpi', 'ppi', 'jobless claims', 'employment', 
                'nonfarm payrolls', 'unemployment rate', 'michigan consumer sentiment',
                'gdp', 'housing starts', 'industrial production', 'fomc', 'fed'
              ];
              
              const lowImpactTerms = [
                'auction', 'treasury', 'bill', 'note', 'bond'
              ];
              
              if (highImpactTerms.some(term => eventLower.includes(term))) {
                impact = 'high';
              } else if (lowImpactTerms.some(term => eventLower.includes(term))) {
                impact = 'low';
              }
              
              // Tentar determinar impacto por estrelinhas também
              if (importanceCell) {
                const importanceHTML = importanceCell.innerHTML || '';
                const starCount = (importanceHTML.match(/grayFullBullishIcon|bull/g) || []).length;
                if (starCount >= 3) impact = 'high';
                else if (starCount >= 2) impact = 'medium';
                else if (starCount >= 1) impact = 'low';
              }
              
              events.push({
                name: eventName,
                time: timeText,
                currency: currency || 'USD',
                impact: impact,
                actual_value: actual || null,
                forecast_value: forecast || '',
                previous_value: previous || '',
                row_index: index
              });
            }
          }
        } catch (error) {
          console.log(`Erro na linha ${index}: ${error.message}`);
        }
      });
      
      return events;
    });

    console.log(`📊 ${events.length} eventos dos EUA capturados`);
    
    if (events.length === 0) {
      console.log('❌ Nenhum evento capturado. Verifique se o filtro está aplicado.');
      return false;
    }

    // Mostrar eventos capturados
    console.log('📋 Primeiros 10 eventos dos EUA:');
    events.slice(0, 10).forEach((event, i) => {
      console.log(`${i+1}. ${event.name} - ${event.time} - ${event.impact} impact`);
    });

    console.log('');
    console.log('💾 Salvando no banco de dados...');
    
    // Zerar banco
    await db.runAsync('DELETE FROM events');
    console.log('🗑️ Banco limpo');
    
    // Inserir eventos dos EUA
    const now = moment.tz('America/New_York');
    let saved = 0;
    
    for (const event of events) {
      try {
        // Criar data para o evento
        const timeMatch = event.time.match(/(\d{1,2}):(\d{2})/);
        let eventDate = now.clone().add(1, 'hour'); // Default
        
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          eventDate = now.clone().hour(hour).minute(minute).second(0);
          
          // Se já passou hoje, usar próximo dia útil
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
        console.log(`⚠️ Erro ao salvar: ${event.name} - ${error.message}`);
      }
    }
    
    console.log(`✅ SUCESSO! ${saved} eventos dos EUA salvos no banco!`);
    console.log('');
    console.log('🎯 Eventos por impacto:');
    
    const highCount = events.filter(e => e.impact === 'high').length;
    const mediumCount = events.filter(e => e.impact === 'medium').length;
    const lowCount = events.filter(e => e.impact === 'low').length;
    
    console.log(`🔴 Alto impacto: ${highCount} eventos`);
    console.log(`🟡 Médio impacto: ${mediumCount} eventos`);
    console.log(`⚪ Baixo impacto: ${lowCount} eventos`);
    console.log('');
    console.log('🔄 Agora recarregue http://localhost:9025 para ver APENAS dados dos EUA!');
    console.log('');
    console.log('Pressione ENTER para fechar...');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    db.close();
    console.log('✅ Processo concluído!');
  }
}

captureFinalUSData();