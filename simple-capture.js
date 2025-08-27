import puppeteer from 'puppeteer';

console.log('🌐 CAPTURA SIMPLES da página do Investing...');

async function simpleCapture() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    
    console.log('📊 Tentando acessar Investing.com...');
    const response = await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log(`✅ Status: ${response.status()}`);
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('📸 Fazendo screenshot...');
    await page.screenshot({ 
      path: 'investing-basic.png',
      fullPage: true
    });

    console.log('💾 Salvando HTML...');
    const html = await page.content();
    require('fs').writeFileSync('investing-basic.html', html);

    console.log('✅ Arquivos salvos:');
    console.log('  • investing-basic.png');
    console.log('  • investing-basic.html');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

simpleCapture();