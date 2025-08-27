import { initDB } from './src/database.js';
import sqlite3 from 'sqlite3';

async function cleanAndImportRealData() {
  console.log('🗑️ Limpando eventos de teste...');
  
  // Conectar ao banco principal
  const db = new sqlite3.Database('./data/alerts.db');
  db.runAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };
  db.allAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, function(err, rows) {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  // Remover todos os eventos de teste
  const deleteResult = await db.runAsync("DELETE FROM events WHERE name LIKE '%🧪%' OR name LIKE '%TESTE%' OR name LIKE '%Test%'");
  console.log(`✅ ${deleteResult.changes} eventos de teste removidos`);

  // Verificar se existe Tabela.sqlite
  const fs = await import('fs');
  if (!fs.existsSync('./Tabela.sqlite')) {
    console.log('❌ Arquivo Tabela.sqlite não encontrado');
    process.exit(1);
  }

  console.log('📊 Importando dados reais da Tabela.sqlite...');
  
  // Conectar à Tabela.sqlite
  const sourceDb = new sqlite3.Database('./Tabela.sqlite');
  sourceDb.allAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
      sourceDb.all(sql, params, function(err, rows) {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    // Buscar todos os eventos da Tabela.sqlite
    const realEvents = await sourceDb.allAsync(`
      SELECT * FROM events 
      WHERE date > datetime('now') 
      ORDER BY date ASC
    `);

    console.log(`📋 Encontrados ${realEvents.length} eventos reais futuros`);

    // Inserir eventos reais no banco principal
    let imported = 0;
    for (const event of realEvents) {
      try {
        await db.runAsync(`
          INSERT OR REPLACE INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          event.name,
          event.date,
          event.impact || 'medium',
          event.forecast_value || '',
          event.previous_value || '',
          event.actual_value,
        ]);
        imported++;
      } catch (err) {
        console.log(`⚠️ Erro ao importar evento: ${event.name}`);
      }
    }

    console.log(`✅ ${imported} eventos reais importados com sucesso`);

    // Verificar resultado
    const totalEvents = await db.allAsync("SELECT COUNT(*) as count FROM events WHERE date > datetime('now')");
    console.log(`📊 Total de eventos futuros no banco: ${totalEvents[0].count}`);

    sourceDb.close();
    db.close();
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    sourceDb.close();
    db.close();
    process.exit(1);
  }
}

cleanAndImportRealData().catch(console.error);