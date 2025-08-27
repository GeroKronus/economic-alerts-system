import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📅 IMPORTANDO DADOS 100% REAIS DO INVESTING.COM...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function importRealInvestingData() {
  try {
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('📊 Inserindo eventos REAIS capturados do Investing.com...');
    
    // Dados REAIS extraídos via WebFetch do Investing.com - 21 Agosto 2025
    const realEvents = [
      // 08:30 ET Events
      {
        name: 'Continuing Jobless Claims',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '1,960K',
        previous_value: '1,972K',
        actual_value: '1,972K',
        currency: 'USD'
      },
      {
        name: 'Initial Jobless Claims',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'high',
        forecast_value: '226K',
        previous_value: '235K',
        actual_value: '235K',
        currency: 'USD'
      },
      {
        name: 'Jobless Claims 4-Week Avg.',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'low',
        forecast_value: '',
        previous_value: '226.25K',
        actual_value: '226.25K',
        currency: 'USD'
      },
      {
        name: 'Philadelphia Fed Manufacturing Index',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'high',
        forecast_value: '6.8',
        previous_value: '15.9',
        actual_value: '-0.3',
        currency: 'USD'
      },
      {
        name: 'Philly Fed Business Conditions',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '21.5',
        actual_value: '25.0',
        currency: 'USD'
      },
      {
        name: 'Philly Fed CAPEX Index',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '17.10',
        actual_value: '38.40',
        currency: 'USD'
      },
      {
        name: 'Philly Fed Employment',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '10.3',
        actual_value: '5.9',
        currency: 'USD'
      },
      {
        name: 'Philly Fed New Orders',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '18.4',
        actual_value: '-1.9',
        currency: 'USD'
      },
      {
        name: 'Philly Fed Prices Paid',
        date: '2025-08-21T12:30:00.000Z', // 08:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '58.80',
        actual_value: '66.80',
        currency: 'USD'
      },
      
      // 09:45 ET Events
      {
        name: 'S&P Global Manufacturing PMI',
        date: '2025-08-21T13:45:00.000Z', // 09:45 ET
        impact: 'medium',
        forecast_value: '49.7',
        previous_value: '49.8',
        actual_value: '53.3',
        currency: 'USD'
      },
      {
        name: 'S&P Global Composite PMI',
        date: '2025-08-21T13:45:00.000Z', // 09:45 ET
        impact: 'medium',
        forecast_value: '53.5',
        previous_value: '55.1',
        actual_value: '55.4',
        currency: 'USD'
      },
      {
        name: 'S&P Global Services PMI',
        date: '2025-08-21T13:45:00.000Z', // 09:45 ET
        impact: 'medium',
        forecast_value: '54.2',
        previous_value: '55.7',
        actual_value: '55.4',
        currency: 'USD'
      },
      
      // 10:00 ET Events
      {
        name: 'Existing Home Sales (MoM)',
        date: '2025-08-21T14:00:00.000Z', // 10:00 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '',
        actual_value: '2.0%',
        currency: 'USD'
      },
      {
        name: 'Existing Home Sales',
        date: '2025-08-21T14:00:00.000Z', // 10:00 ET
        impact: 'high',
        forecast_value: '3.92M',
        previous_value: '3.93M',
        actual_value: '4.01M',
        currency: 'USD'
      },
      {
        name: 'US Leading Index (MoM)',
        date: '2025-08-21T14:00:00.000Z', // 10:00 ET
        impact: 'medium',
        forecast_value: '-0.1%',
        previous_value: '-0.3%',
        actual_value: '-0.1%',
        currency: 'USD'
      },
      
      // 10:30 ET Events
      {
        name: 'Natural Gas Storage',
        date: '2025-08-21T14:30:00.000Z', // 10:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '',
        actual_value: '13B',
        currency: 'USD'
      },
      
      // 11:30 ET Events
      {
        name: '4-Week Bill Auction',
        date: '2025-08-21T15:30:00.000Z', // 11:30 ET
        impact: 'low',
        forecast_value: '',
        previous_value: '',
        actual_value: '4.300%',
        currency: 'USD'
      },
      {
        name: '8-Week Bill Auction',
        date: '2025-08-21T15:30:00.000Z', // 11:30 ET
        impact: 'low',
        forecast_value: '',
        previous_value: '',
        actual_value: '4.220%',
        currency: 'USD'
      }
    ];
    
    console.log(`💾 Inserindo ${realEvents.length} eventos REAIS...`);
    
    let insertedCount = 0;
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    let lowImpactCount = 0;
    
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
        
        // Contar por impacto
        if (event.impact === 'high') highImpactCount++;
        else if (event.impact === 'medium') mediumImpactCount++;
        else lowImpactCount++;
        
        const eventDate = moment(event.date).tz('America/New_York');
        const timeStr = eventDate.format('HH:mm');
        
        // Mostrar resultado vs previsão
        let resultIcon = '📊';
        if (event.actual_value && event.forecast_value) {
          const actual = parseFloat(event.actual_value.replace(/[^\\d.-]/g, ''));
          const forecast = parseFloat(event.forecast_value.replace(/[^\\d.-]/g, ''));
          
          if (!isNaN(actual) && !isNaN(forecast)) {
            if (actual > forecast) resultIcon = '📈';
            else if (actual < forecast) resultIcon = '📉';
            else resultIcon = '🎯';
          }
        }
        
        console.log(`✅ ${resultIcon} ${event.name}`);
        console.log(`   ${timeStr} ET - ${event.impact} impact`);
        console.log(`   Previsão: ${event.forecast_value || 'N/A'} | Atual: ${event.actual_value || 'Pendente'}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao inserir ${event.name}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO DOS DADOS REAIS:');
    console.log(`✅ ${insertedCount} eventos REAIS inseridos`);
    console.log(`🔴 ${highImpactCount} eventos de ALTO impacto`);
    console.log(`🟡 ${mediumImpactCount} eventos de MÉDIO impacto`);
    console.log(`⚪ ${lowImpactCount} eventos de BAIXO impacto`);
    console.log('');
    console.log('📋 FONTE: WebFetch direto do Investing.com (21 Agosto 2025)');
    console.log('🎯 DESTAQUES REAIS:');
    console.log('📈 S&P PMI: 53.3 vs 49.7 (MUITO ACIMA DA PREVISÃO!)');
    console.log('📈 Home Sales: 4.01M vs 3.92M (ACIMA DA PREVISÃO!)');
    console.log('📉 Philly Fed: -0.3 vs 6.8 (MUITO ABAIXO DA PREVISÃO!)');
    console.log('📈 Jobless Claims: 235K vs 226K (PIOR QUE ESPERADO)');
    console.log('');
    console.log('🔄 AGORA: Recarregue http://localhost:9025');
    console.log('✨ Sistema com DADOS 100% REAIS do Investing.com!');
    
  } catch (error) {
    console.error('❌ ERRO na importação:', error.message);
  } finally {
    db.close();
  }
}

importRealInvestingData();