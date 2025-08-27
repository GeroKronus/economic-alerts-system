import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📅 IMPORTANDO DADOS DO BANCO EXTERNO: calendario_US_nextweek_final.sqlite');

// Banco externo (fonte)
const externalDb = new sqlite3.Database('./calendario_US_nextweek_final.sqlite');

// Banco da aplicação (destino)
const appDb = new sqlite3.Database('./data/alerts.db');

// Promisify para usar async/await
externalDb.allAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    externalDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

appDb.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    appDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Função para converter impacto numérico para texto
function convertImpact(numericImpact) {
  switch(parseInt(numericImpact)) {
    case 1: return 'low';
    case 2: return 'medium';
    case 3: return 'high';
    default: return 'medium';
  }
}

// Função para converter data e hora para UTC
function convertToUTC(date, time) {
  try {
    // Formato: "2025-08-25" + "12:00" = "2025-08-25 12:00"
    const dateTimeStr = `${date} ${time}`;
    
    // Assumir que é Eastern Time e converter para UTC
    const etMoment = moment.tz(dateTimeStr, 'YYYY-MM-DD HH:mm', 'America/New_York');
    return etMoment.utc().format();
    
  } catch (error) {
    console.log(`⚠️ Erro ao converter data/hora: ${date} ${time} - ${error.message}`);
    return new Date().toISOString(); // Fallback
  }
}

async function importFromExternalSQLite() {
  try {
    console.log('🗑️ Limpando banco da aplicação...');
    await appDb.runAsync('DELETE FROM events');
    
    console.log('📊 Lendo dados do banco externo...');
    const externalEvents = await externalDb.allAsync(`
      SELECT * FROM economic_calendar 
      WHERE currency = 'USD'
      ORDER BY date ASC, time ASC
    `);
    
    console.log(`📋 Encontrados ${externalEvents.length} eventos USD no banco externo`);
    
    let insertedCount = 0;
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    let lowImpactCount = 0;
    
    for (const externalEvent of externalEvents) {
      try {
        const impact = convertImpact(externalEvent.impact);
        const utcDateTime = convertToUTC(externalEvent.date, externalEvent.time);
        
        await appDb.runAsync(`
          INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          externalEvent.event,
          utcDateTime,
          impact,
          externalEvent.forecast || '',
          externalEvent.previous || '',
          externalEvent.actual || null
        ]);
        
        insertedCount++;
        
        // Contar por impacto
        if (impact === 'high') highImpactCount++;
        else if (impact === 'medium') mediumImpactCount++;
        else lowImpactCount++;
        
        // Log do evento importado
        const etMoment = moment(utcDateTime).tz('America/New_York');
        const dayName = etMoment.format('dddd');
        const timeStr = etMoment.format('HH:mm');
        const dateStr = etMoment.format('MM/DD');
        
        // Ícone baseado no resultado vs previsão
        let resultIcon = '📊';
        if (externalEvent.actual && externalEvent.forecast) {
          const actual = parseFloat(externalEvent.actual.replace(/[^\\d.-]/g, ''));
          const forecast = parseFloat(externalEvent.forecast.replace(/[^\\d.-]/g, ''));
          
          if (!isNaN(actual) && !isNaN(forecast)) {
            if (actual > forecast) resultIcon = '📈';
            else if (actual < forecast) resultIcon = '📉';
            else resultIcon = '🎯';
          }
        }
        
        console.log(`✅ ${resultIcon} ${externalEvent.event}`);
        console.log(`   ${dayName} ${dateStr} ${timeStr} ET - ${impact} impact`);
        console.log(`   Previsão: ${externalEvent.forecast || 'N/A'} | Atual: ${externalEvent.actual || 'Pendente'} | Anterior: ${externalEvent.previous || 'N/A'}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao importar evento ${externalEvent.event}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO DA IMPORTAÇÃO:');
    console.log(`✅ ${insertedCount} eventos importados com sucesso`);
    console.log(`🔴 ${highImpactCount} eventos de ALTO impacto`);
    console.log(`🟡 ${mediumImpactCount} eventos de MÉDIO impacto`);
    console.log(`⚪ ${lowImpactCount} eventos de BAIXO impacto`);
    console.log('');
    console.log('📋 FONTE: calendario_US_nextweek_final.sqlite');
    console.log('🎯 DADOS: Calendário econômico completo da próxima semana');
    console.log('📈 VALORES: Incluindo dados atuais vs previsão vs anterior');
    console.log('');
    console.log('🔄 AGORA: Recarregue http://localhost:9025');
    console.log('✨ Sistema com DADOS COMPLETOS do SQLite externo!');
    
  } catch (error) {
    console.error('❌ ERRO na importação:', error.message);
  } finally {
    externalDb.close();
    appDb.close();
  }
}

importFromExternalSQLite();