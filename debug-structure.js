import puppeteer from 'puppeteer';
import fs from 'fs';

console.log('🔍 CAPTURANDO ESTRUTURA para debug...');

async function debugStructure() {
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

    console.log('🎯 Configure os filtros para Estados Unidos e pressione ENTER...');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('📸 Capturando screenshot e HTML...');
    
    // Screenshot
    await page.screenshot({ 
      path: 'filtered-page.png', 
      fullPage: true 
    });
    
    // HTML completo
    const html = await page.content();
    fs.writeFileSync('filtered-page.html', html);
    
    // Tentar diferentes seletores e ver quantos elementos cada um encontra
    const selectorResults = await page.evaluate(() => {
      const selectors = [
        'table tbody tr',
        'tr',
        '.js-event-item',
        '[data-event-datetime]',
        '#economicCalendarData tr',
        '.calendar-row',
        '.event-row',
        '[class*="event"]',
        '[class*="calendar"]',
        'td:contains("USD")',
        '.flag-US'
      ];
      
      const results = {};
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          results[selector] = elements.length;
        } catch (error) {
          results[selector] = `ERROR: ${error.message}`;
        }
      });
      
      return results;
    });
    
    console.log('📋 Resultados dos seletores:');
    Object.entries(selectorResults).forEach(([selector, count]) => {
      console.log(`  ${selector}: ${count} elementos`);
    });
    
    // Tentar capturar qualquer texto que contenha "USD" ou horários
    const usdContent = await page.evaluate(() => {
      const allText = document.body.textContent;
      const lines = allText.split('\n');
      const relevantLines = lines.filter(line => 
        line.includes('USD') || 
        line.match(/\d{1,2}:\d{2}/) ||
        line.includes('Retail') ||
        line.includes('CPI') ||
        line.includes('PPI')
      );
      return relevantLines.slice(0, 20); // Primeiras 20 linhas relevantes
    });
    
    console.log('💱 Linhas com USD ou horários encontradas:');
    usdContent.forEach((line, i) => {
      console.log(`${i+1}. ${line.trim()}`);
    });
    
    console.log('');
    console.log('📁 Arquivos salvos:');
    console.log('  • filtered-page.png (screenshot)');
    console.log('  • filtered-page.html (HTML completo)');
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
  }
}

debugStructure();