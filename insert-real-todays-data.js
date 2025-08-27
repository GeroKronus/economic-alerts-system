import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📊 INSERINDO DADOS REAIS DE HOJE (21 Agosto 2025)...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function insertTodaysRealData() {
  try {
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('💾 Inserindo eventos REAIS de hoje...');
    
    const today = moment.tz('America/New_York').format('YYYY-MM-DD');
    
    // Dados EXATOS extraídos do WebFetch
    const realEvents = [
      {
        name: 'US Existing Home Sales',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'medium',
        forecast_value: '3.92M',
        previous_value: '3.93M',
        actual_value: '4.01M', // BATEU A PREVISÃO!
        currency: 'USD'
      },
      {
        name: 'US S&P Global Manufacturing PMI',
        time: '09:45',
        date: `${today}T09:45:00.000Z`,
        impact: 'medium',
        forecast_value: '49.7',
        previous_value: '49.8',
        actual_value: '53.3', // MUITO ACIMA DA PREVISÃO!
        currency: 'USD'
      },
      {
        name: 'US Initial Jobless Claims',
        time: '08:30',
        date: `${today}T08:30:00.000Z`,
        impact: 'high', // Jobless Claims = alto impacto
        forecast_value: '226K',
        previous_value: '224K',
        actual_value: '235K', // ACIMA DA PREVISÃO
        currency: 'USD'
      },
      {
        name: 'Eurozone Manufacturing PMI',
        time: '04:00',
        date: `${today}T04:00:00.000Z`,
        impact: 'medium',
        forecast_value: '49.5',
        previous_value: '49.8',
        actual_value: '50.5', // BATEU A PREVISÃO
        currency: 'EUR'
      },
      {
        name: 'Jackson Hole Symposium',
        time: '20:00',
        date: `${today}T20:00:00.000Z`,
        impact: 'high', // Fed events = alto impacto
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Japan CPI Release',
        time: '19:30',
        date: `${today}T19:30:00.000Z`,
        impact: 'high', // CPI = alto impacto
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'JPY'
      },
      {
        name: 'RBI MPC Meeting Minutes',
        time: '07:30',
        date: `${today}T07:30:00.000Z`,
        impact: 'medium',
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'INR'
      }
    ];
    
    let insertedCount = 0;
    
    for (const event of realEvents) {
      try {
        await db.runAsync(
          `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            event.name, 
            event.date, 
            event.impact, 
            event.forecast_value, 
            event.previous_value, 
            event.actual_value
          ]
        );
        
        insertedCount++;
        
        // Mostrar resultado vs previsão
        let resultIcon = '📊';
        if (event.actual_value && event.forecast_value) {
          const actual = parseFloat(event.actual_value.replace(/[^\d.-]/g, ''));
          const forecast = parseFloat(event.forecast_value.replace(/[^\d.-]/g, ''));
          
          if (actual > forecast) resultIcon = '📈';
          else if (actual < forecast) resultIcon = '📉';
          else resultIcon = '🎯';
        }
        
        console.log(`✅ ${resultIcon} ${event.name}`);
        console.log(`   ${event.time} ET - ${event.impact} impact`);
        console.log(`   Previsão: ${event.forecast_value || 'N/A'} | Atual: ${event.actual_value || 'Pendente'}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao inserir ${event.name}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO:');
    console.log(`✅ ${insertedCount} eventos reais inseridos`);
    
    const highImpact = realEvents.filter(e => e.impact === 'high').length;
    const mediumImpact = realEvents.filter(e => e.impact === 'medium').length;
    
    console.log(`🔴 ${highImpact} eventos de ALTO impacto`);
    console.log(`🟡 ${mediumImpact} eventos de MÉDIO impacto`);
    console.log('');
    console.log('🎯 DADOS REAIS vs PREVISÕES:');
    console.log('📈 S&P PMI: 53.3 vs 49.7 (MUITO ACIMA!)');
    console.log('📈 Home Sales: 4.01M vs 3.92M (ACIMA)');
    console.log('📉 Jobless Claims: 235K vs 226K (PIOR - mais desemprego)');
    console.log('📈 EU PMI: 50.5 vs 49.5 (ACIMA)');
    console.log('');
    console.log('🔄 Agora recarregue http://localhost:9025');
    console.log('📱 O sistema de alertas está rodando com dados REAIS!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    db.close();
  }
}

insertTodaysRealData();