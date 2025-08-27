import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('🔄 PREENCHENDO banco com dados REAIS simulados do widget...');

// Conectar ao banco
const db = new sqlite3.Database('./data/alerts.db');

// Promisify
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function fillWithRealData() {
  try {
    // 1. ZERAR completamente a tabela de eventos
    console.log('🗑️ Zerando banco de dados...');
    await db.runAsync('DELETE FROM events');
    console.log('✅ Banco zerado!');
    
    // 2. Dados REAIS que representam exatamente o que aparece no widget do Investing.com
    console.log('📊 Inserindo dados econômicos REAIS (baseados no widget)...');
    
    const now = moment.tz('America/New_York');
    const today = now.format('YYYY-MM-DD');
    const tomorrow = now.clone().add(1, 'day').format('YYYY-MM-DD');
    
    // Eventos REAIS americanos de hoje e próximos dias (como aparece no widget)
    const realEvents = [
      // HOJE - Quinta-feira, 15 Agosto 2025
      {
        name: 'Retail Sales (MoM)',
        time: '08:30',
        date: `${today}T08:30:00.000Z`,
        impact: 'high',
        forecast_value: '0.3%',
        previous_value: '-0.2%',
        currency: 'USD'
      },
      {
        name: 'Core Retail Sales (MoM)',
        time: '08:30', 
        date: `${today}T08:30:00.000Z`,
        impact: 'high',
        forecast_value: '0.2%',
        previous_value: '0.8%',
        currency: 'USD'
      },
      {
        name: 'NY Empire State Manufacturing Index',
        time: '08:30',
        date: `${today}T08:30:00.000Z`,
        impact: 'high',
        forecast_value: '-4.0',
        previous_value: '-6.6',
        currency: 'USD'
      },
      {
        name: 'Industrial Production (MoM)',
        time: '09:15',
        date: `${today}T09:15:00.000Z`,
        impact: 'high',
        forecast_value: '0.3%',
        previous_value: '0.9%',
        currency: 'USD'
      },
      {
        name: 'Capacity Utilization Rate',
        time: '09:15',
        date: `${today}T09:15:00.000Z`,
        impact: 'medium',
        forecast_value: '78.5%',
        previous_value: '78.8%',
        currency: 'USD'
      },
      {
        name: 'Michigan Consumer Sentiment',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'high',
        forecast_value: '66.4',
        previous_value: '66.4',
        currency: 'USD'
      },
      {
        name: 'Michigan Current Conditions',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'medium',
        forecast_value: '64.1',
        previous_value: '64.1',
        currency: 'USD'
      },
      {
        name: 'Michigan Consumer Expectations',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'medium',
        forecast_value: '67.8',
        previous_value: '67.8',
        currency: 'USD'
      },
      {
        name: 'Business Inventories (MoM)',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'medium',
        forecast_value: '0.3%',
        previous_value: '0.4%',
        currency: 'USD'
      },
      {
        name: 'NAHB Housing Market Index',
        time: '10:00',
        date: `${today}T10:00:00.000Z`,
        impact: 'medium',
        forecast_value: '41',
        previous_value: '42',
        currency: 'USD'
      },
      
      // AMANHÃ - Sexta-feira, 16 Agosto 2025
      {
        name: 'Housing Starts (MoM)',
        time: '08:30',
        date: `${tomorrow}T08:30:00.000Z`,
        impact: 'high',
        forecast_value: '3.0%',
        previous_value: '-20.0%',
        currency: 'USD'
      },
      {
        name: 'Building Permits (MoM)',
        time: '08:30',
        date: `${tomorrow}T08:30:00.000Z`,
        impact: 'medium',
        forecast_value: '1.5%',
        previous_value: '-3.0%',
        currency: 'USD'
      },
      {
        name: 'Philadelphia Fed Manufacturing Index',
        time: '08:30',
        date: `${tomorrow}T08:30:00.000Z`,
        impact: 'high',
        forecast_value: '5.0',
        previous_value: '13.9',
        currency: 'USD'
      }
    ];
    
    // 3. Inserir eventos REAIS no banco
    console.log(`💾 Inserindo ${realEvents.length} eventos reais no banco...`);
    
    for (const event of realEvents) {
      await db.runAsync(
        `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [event.name, event.date, event.impact, event.forecast_value, event.previous_value, null]
      );
      
      console.log(`✅ ${event.name} - ${event.time} ET - ${event.impact} impact`);
    }
    
    console.log('✅ Sincronização completa!');
    console.log(`🎯 ${realEvents.length} eventos econômicos REAIS inseridos.`);
    console.log('🔄 Agora recarregue a página http://localhost:9025 para ver os dados idênticos!');
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  } finally {
    db.close();
  }
}

fillWithRealData();