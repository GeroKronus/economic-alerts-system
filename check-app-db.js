import sqlite3 from 'sqlite3';

console.log('📋 VERIFICANDO BANCO DA APLICAÇÃO (data/alerts.db)...');

const db = new sqlite3.Database('./data/alerts.db');

db.allAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function checkAppDatabase() {
  try {
    // Contar registros
    const count = await db.allAsync(`SELECT COUNT(*) as total FROM events;`);
    console.log(`📊 Total de eventos no banco da aplicação: ${count[0].total}`);
    
    // Mostrar primeiros 5 registros
    const samples = await db.allAsync(`SELECT * FROM events ORDER BY date ASC LIMIT 5;`);
    console.log('\n📋 PRIMEIROS 5 EVENTOS NO BANCO DA APLICAÇÃO:');
    samples.forEach((event, i) => {
      console.log(`${i+1}. ${event.name}`);
      console.log(`   Data: ${event.date} | Impacto: ${event.impact}`);
      console.log(`   Atual: ${event.actual_value || 'N/A'} | Previsão: ${event.forecast_value || 'N/A'} | Anterior: ${event.previous_value || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    db.close();
  }
}

checkAppDatabase();