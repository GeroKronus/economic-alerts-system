import puppeteer from 'puppeteer';

console.log('📄 CAPTURA DE PÁGINA COMPLETA (com scroll)...');

async function captureFullPage() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🌐 Navegando para Investing.com...');
    await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('⏳ Aguardando carregamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🎯 Configure filtros se necessário e pressione ENTER...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('📜 Fazendo scroll para capturar página completa...');
    
    // Scroll automático até o final
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    console.log('📸 Capturando screenshot da página completa...');
    await page.screenshot({ 
      path: 'investing-full-page.png', 
      fullPage: true 
    });

    console.log('💾 Salvando HTML completo...');
    const html = await page.content();
    require('fs').writeFileSync('investing-full-page.html', html);

    // Extrair dados visíveis
    console.log('🔍 Extraindo todos os eventos visíveis...');
    const events = await page.evaluate(() => {
      const events = [];
      
      // Diferentes seletores para capturar tudo
      const selectors = [
        'tr[data-event-datetime]',
        '.js-event-item',
        'table tbody tr',
        '.calendar-row'
      ];
      
      selectors.forEach(selector => {
        const rows = document.querySelectorAll(selector);
        
        rows.forEach((row, index) => {
          try {
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 4) {
              const timeText = cells[0]?.textContent?.trim() || '';
              const currency = cells[1]?.textContent?.trim() || '';
              const eventName = cells[3]?.textContent?.trim() || '';
              const actual = cells[4]?.textContent?.trim() || '';
              const forecast = cells[5]?.textContent?.trim() || '';
              const previous = cells[6]?.textContent?.trim() || '';
              
              if (timeText && eventName && eventName.length > 3) {
                events.push({
                  selector_used: selector,
                  name: eventName,
                  time: timeText,
                  currency: currency,
                  actual: actual,
                  forecast: forecast,
                  previous: previous
                });
              }
            }
          } catch (error) {
            // Ignorar erros
          }
        });
      });
      
      return events;
    });

    console.log(`📊 ${events.length} eventos extraídos da página completa`);
    
    // Salvar dados extraídos
    require('fs').writeFileSync('investing-events-data.json', JSON.stringify(events, null, 2));

    console.log('📁 Arquivos salvos:');
    console.log('  • investing-full-page.png (screenshot completo)');
    console.log('  • investing-full-page.html (HTML completo)');
    console.log('  • investing-events-data.json (dados estruturados)');
    
    console.log('\n📋 Primeiros 10 eventos encontrados:');
    events.slice(0, 10).forEach((event, i) => {
      console.log(`${i+1}. ${event.name} - ${event.time} - ${event.currency}`);
    });

    console.log('\nPressione ENTER para fechar...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

captureFullPage();