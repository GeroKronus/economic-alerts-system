import puppeteer from 'puppeteer';

console.log('🧪 TESTE SIMPLES: Verificando acesso ao Investing.com...');

async function testAccess() {
  let browser;
  
  try {
    console.log('🌐 Abrindo navegador...');
    browser = await puppeteer.launch({
      headless: true, // Sem interface gráfica
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📊 Testando acesso...');
    const response = await page.goto('https://www.investing.com/economic-calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    console.log(`✅ Status: ${response.status()}`);
    
    if (response.status() === 200) {
      console.log('🎯 ACESSO FUNCIONOU! Site respondeu.');
      
      // Tentar capturar título da página
      const title = await page.title();
      console.log(`📄 Título: ${title}`);
      
      // Verificar se tem tabela
      const hasTable = await page.evaluate(() => {
        return document.querySelector('table') !== null;
      });
      console.log(`📋 Tem tabela: ${hasTable}`);
      
      return true;
    } else {
      console.log(`❌ BLOQUEADO: Status ${response.status()}`);
      return false;
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testAccess();