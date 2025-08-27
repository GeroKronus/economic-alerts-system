import sqlite3 from 'sqlite3';

console.log('📋 VERIFICANDO TABELA.SQLITE ATUAL...');

const db = new sqlite3.Database('./Tabela.sqlite');

db.allAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function checkTabelaSQLite() {
  try {
    // Verificar tabelas
    const tables = await db.allAsync(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`);
    console.log(`📊 Tabelas: ${tables.map(t => t.name).join(', ')}`);
    
    // Verificar estrutura
    const schema = await db.allAsync(`PRAGMA table_info(economic_calendar);`);
    console.log('🔧 Estrutura da tabela:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
    // Contar registros
    const count = await db.allAsync(`SELECT COUNT(*) as total FROM economic_calendar;`);
    console.log(`📊 Total de registros: ${count[0].total}`);
    
    // Mostrar primeiros 5 registros
    const samples = await db.allAsync(`SELECT * FROM economic_calendar ORDER BY date ASC, time ASC LIMIT 5;`);
    console.log('\n📋 PRIMEIROS 5 EVENTOS:');
    samples.forEach((event, i) => {
      console.log(`${i+1}. ${event.event}`);
      console.log(`   Data: ${event.date} ${event.time} | Impacto: ${event.impact}`);
      console.log(`   Atual: ${event.actual || 'N/A'} | Previsão: ${event.forecast || 'N/A'} | Anterior: ${event.previous || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    db.close();
  }
}

checkTabelaSQLite();