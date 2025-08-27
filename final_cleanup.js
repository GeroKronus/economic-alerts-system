import sqlite3 from 'sqlite3';

async function finalCleanup() {
  console.log('🧹 Removendo últimos eventos de teste...');
  
  const db = new sqlite3.Database('./data/alerts.db');
  db.runAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };

  try {
    const result = await db.runAsync("DELETE FROM events WHERE name LIKE '%🧪%' OR name LIKE '%TESTE%' OR name LIKE '%Test%'");
    console.log(`✅ ${result.changes} eventos de teste removidos`);

    const countResult = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM events WHERE date > datetime('now')", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log(`📊 Total de eventos reais futuros: ${countResult.count}`);
    
    db.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    db.close();
  }
}

finalCleanup().catch(console.error);