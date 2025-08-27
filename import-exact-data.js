import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📅 IMPORTANDO DADOS EXATOS (baseado nas screenshots)...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function importExactData() {
  try {
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('📊 Inserindo dados EXATOS baseados no Investing.com...');
    
    // Dados EXATOS baseados nas screenshots do usuário
    const exactEvents = [
      // QUINTA-FEIRA 28 AGOSTO (baseado na screenshot)
      {
        name: 'Continuing Jobless Claims',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'medium',
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Core PCE Prices (Q2)',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'high',
        forecast_value: '2.50%',
        previous_value: '3.50%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Corporate Profits (QoQ) (Q2)',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'low',
        forecast_value: '',
        previous_value: '-3.3%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP (QoQ) (Q2)',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'high',
        forecast_value: '3.0%',
        previous_value: '-0.5%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP Price Index (QoQ) (Q2)',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'medium',
        forecast_value: '2.0%',
        previous_value: '3.8%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP Sales (Q2)',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'medium',
        forecast_value: '6.3%',
        previous_value: '-3.1%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Initial Jobless Claims',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'high',
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Jobless Claims 4-Week Avg.',
        date: '2025-08-28T13:30:00.000Z', // 09:30 ET
        impact: 'low',
        forecast_value: '',
        previous_value: '',
        actual_value: null,
        currency: 'USD'
      }
    ];
    
    console.log(`💾 Inserindo ${exactEvents.length} eventos exatos...`);
    
    let insertedCount = 0;
    
    for (const event of exactEvents) {
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
        
        const eventDate = moment(event.date).tz('America/New_York');
        const dayName = eventDate.format('dddd');
        const timeStr = eventDate.format('HH:mm');
        
        console.log(`✅ ${event.name}`);
        console.log(`   ${dayName} ${timeStr} ET - ${event.impact} impact`);
        console.log(`   Previsão: ${event.forecast_value || 'N/A'} (anterior: ${event.previous_value || 'N/A'})`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao inserir ${event.name}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO:');
    console.log(`✅ ${insertedCount} eventos exatos inseridos`);
    console.log('📋 Dados baseados nas screenshots do Investing.com');
    console.log('🔄 AGORA: Recarregue http://localhost:9025');
    console.log('✨ Sistema com DADOS EXATOS!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    db.close();
  }
}

importExactData();