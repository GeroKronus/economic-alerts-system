import sqlite3 from 'sqlite3';

async function importRealData() {
  console.log('📊 Importando dados reais da Tabela.sqlite...');
  
  const fs = await import('fs');
  if (!fs.existsSync('./Tabela.sqlite')) {
    console.log('❌ Arquivo Tabela.sqlite não encontrado');
    return;
  }

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
    // Limpar tabela de eventos atual (manter apenas dados reais)
    await db.runAsync("DELETE FROM events");
    console.log('🗑️ Banco de eventos limpo');

    // Buscar todos os eventos da Tabela.sqlite
    const realEvents = await sourceDb.allAsync(`
      SELECT date, time, currency, impact, event, actual, forecast, previous 
      FROM economic_calendar 
      ORDER BY date ASC, time ASC
    `);

    console.log(`📋 Encontrados ${realEvents.length} eventos na Tabela.sqlite`);

    // Converter e inserir eventos
    let imported = 0;
    let futureEvents = 0;
    const now = new Date();

    for (const event of realEvents) {
      try {
        // Criar datetime combinando date e time
        const eventDateTime = new Date(`${event.date}T${event.time}:00.000Z`);
        
        // Determinar nível de impacto
        let impactLevel = 'low';
        if (event.impact >= 3) impactLevel = 'high';
        else if (event.impact >= 2) impactLevel = 'medium';

        // Só contar eventos futuros
        if (eventDateTime > now) {
          futureEvents++;
        }

        await db.runAsync(`
          INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          event.event,
          eventDateTime.toISOString(),
          impactLevel,
          event.forecast || '',
          event.previous || '',
          event.actual || null
        ]);
        imported++;
      } catch (err) {
        console.log(`⚠️ Erro ao importar evento: ${event.event} - ${err.message}`);
      }
    }

    console.log(`✅ ${imported} eventos importados com sucesso`);
    console.log(`🔮 ${futureEvents} eventos futuros disponíveis`);

    // Verificar resultado
    const totalEvents = await db.allAsync("SELECT COUNT(*) as count FROM events WHERE date > datetime('now')");
    console.log(`📊 Total de eventos futuros no banco: ${totalEvents[0].count}`);

    // Mostrar próximos eventos
    const upcomingEvents = await db.allAsync(`
      SELECT name, date, impact 
      FROM events 
      WHERE date > datetime('now') 
      ORDER BY date ASC 
      LIMIT 10
    `);

    console.log('\n📅 Próximos 10 eventos:');
    upcomingEvents.forEach((event, index) => {
      const eventDate = new Date(event.date);
      const impact = event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '⚪';
      console.log(`${index + 1}. ${impact} ${eventDate.toLocaleString('pt-BR')} - ${event.name}`);
    });

    sourceDb.close();
    db.close();
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    sourceDb.close();
    db.close();
    process.exit(1);
  }
}

importRealData().catch(console.error);