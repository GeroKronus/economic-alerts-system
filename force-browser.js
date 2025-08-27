import puppeteer from 'puppeteer';

console.log('🌐 FORÇANDO ABERTURA DO NAVEGADOR...');

async function forceBrowser() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--start-maximized',
        '--new-window',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ],
      defaultViewport: null
    });

    const page = await browser.newPage();
    
    console.log('📊 Navegando para Investing.com...');
    await page.goto('https://www.investing.com/economic-calendar/');
    
    console.log('✅ Navegador aberto! Configure o filtro para Estados Unidos');
    console.log('🔍 Procure por bandeiras de países e selecione apenas USA 🇺🇸');
    
    // Manter o navegador aberto indefinidamente
    console.log('💡 Pressione Ctrl+C quando terminar de configurar');
    
    // Aguardar indefinidamente
    await new Promise(() => {}); // Never resolves
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

forceBrowser();