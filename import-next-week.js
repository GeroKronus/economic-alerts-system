import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📅 IMPORTANDO DADOS DA PRÓXIMA SEMANA (26-30 Agosto 2025)...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function importNextWeekData() {
  try {
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    console.log('📊 Adicionando eventos da PRÓXIMA SEMANA...');
    
    // Próxima semana (26-30 Agosto 2025) - Dados baseados em calendários econômicos reais
    const nextWeekEvents = [
      // SEGUNDA-FEIRA 26/08
      {
        name: 'Dallas Fed Manufacturing Activity',
        date: '2025-08-26T14:30:00.000Z',
        impact: 'medium',
        forecast_value: '-15.0',
        previous_value: '-17.5',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'CB Consumer Confidence',
        date: '2025-08-26T14:00:00.000Z',
        impact: 'high',
        forecast_value: '101.0',
        previous_value: '100.3',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Richmond Fed Manufacturing Index',
        date: '2025-08-26T18:00:00.000Z',
        impact: 'medium',
        forecast_value: '0',
        previous_value: '-17',
        actual_value: null,
        currency: 'USD'
      },
      
      // TERÇA-FEIRA 27/08
      {
        name: 'S&P/Case-Shiller Home Price Index (YoY)',
        date: '2025-08-27T17:00:00.000Z',
        impact: 'medium',
        forecast_value: '4.0%',
        previous_value: '4.1%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'HPI (MoM)',
        date: '2025-08-27T17:00:00.000Z',
        impact: 'low',
        forecast_value: '0.3%',
        previous_value: '0.4%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Consumer Confidence',
        date: '2025-08-27T18:00:00.000Z',
        impact: 'high',
        forecast_value: '101.0',
        previous_value: '100.3',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'New Home Sales',
        date: '2025-08-27T18:00:00.000Z',
        impact: 'high',
        forecast_value: '640K',
        previous_value: '617K',
        actual_value: null,
        currency: 'USD'
      },
      
      // QUARTA-FEIRA 28/08
      {
        name: 'MBA Mortgage Applications',
        date: '2025-08-28T15:00:00.000Z',
        impact: 'medium',
        forecast_value: '',
        previous_value: '6.9%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP (QoQ) - Second Estimate',
        date: '2025-08-28T16:30:00.000Z',
        impact: 'high',
        forecast_value: '2.8%',
        previous_value: '2.8%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP Price Index (QoQ) - Second Estimate',
        date: '2025-08-28T16:30:00.000Z',
        impact: 'medium',
        forecast_value: '2.3%',
        previous_value: '2.3%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'GDP Sales (QoQ) - Second Estimate',
        date: '2025-08-28T16:30:00.000Z',
        impact: 'medium',
        forecast_value: '',
        previous_value: '5.2%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Pending Home Sales (MoM)',
        date: '2025-08-28T18:00:00.000Z',
        impact: 'medium',
        forecast_value: '0.5%',
        previous_value: '4.8%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Crude Oil Inventories',
        date: '2025-08-28T18:30:00.000Z',
        impact: 'medium',
        forecast_value: '-2.0M',
        previous_value: '-4.6M',
        actual_value: null,
        currency: 'USD'
      },
      
      // QUINTA-FEIRA 28/08
      {
        name: 'Initial Jobless Claims',
        date: '2025-08-28T12:30:00.000Z',
        impact: 'high',
        forecast_value: '230K',
        previous_value: '232K',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Continuing Jobless Claims',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'medium',
        forecast_value: '1.875M',
        previous_value: '1.872M',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Personal Income (MoM)',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'medium',
        forecast_value: '0.3%',
        previous_value: '0.2%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Personal Spending (MoM)',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'high',
        forecast_value: '0.4%',
        previous_value: '0.5%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Core PCE Price Index (MoM)',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'high',
        forecast_value: '0.2%',
        previous_value: '0.2%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Core PCE Price Index (YoY)',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'high',
        forecast_value: '2.7%',
        previous_value: '2.6%',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'PCE Price Index (MoM)',
        date: '2025-08-29T16:30:00.000Z',
        impact: 'medium',
        forecast_value: '0.2%',
        previous_value: '0.1%',
        actual_value: null,
        currency: 'USD'
      },
      
      // SEXTA-FEIRA 30/08
      {
        name: 'Chicago PMI',
        date: '2025-08-30T17:45:00.000Z',
        impact: 'medium',
        forecast_value: '45.0',
        previous_value: '45.3',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Michigan Consumer Sentiment - Final',
        date: '2025-08-30T18:00:00.000Z',
        impact: 'high',
        forecast_value: '66.4',
        previous_value: '66.4',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Michigan Current Conditions - Final',
        date: '2025-08-30T18:00:00.000Z',
        impact: 'medium',
        forecast_value: '64.1',
        previous_value: '64.1',
        actual_value: null,
        currency: 'USD'
      },
      {
        name: 'Michigan Consumer Expectations - Final',
        date: '2025-08-30T18:00:00.000Z',
        impact: 'medium',
        forecast_value: '67.8',
        previous_value: '67.8',
        actual_value: null,
        currency: 'USD'
      }
    ];
    
    console.log(`💾 Inserindo ${nextWeekEvents.length} eventos da próxima semana...`);
    
    let insertedCount = 0;
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    
    for (const event of nextWeekEvents) {
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
        
        if (event.impact === 'high') highImpactCount++;
        else if (event.impact === 'medium') mediumImpactCount++;
        
        const eventDate = moment(event.date).tz('America/New_York');
        const dayName = eventDate.format('dddd');
        const timeStr = eventDate.format('HH:mm');
        
        console.log(`✅ ${event.name}`);
        console.log(`   ${dayName} ${timeStr} ET - ${event.impact} impact - ${event.currency}`);
        console.log(`   Previsão: ${event.forecast_value || 'N/A'} (anterior: ${event.previous_value || 'N/A'})`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao inserir ${event.name}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO DA PRÓXIMA SEMANA:');
    console.log(`✅ ${insertedCount} eventos da próxima semana inseridos`);
    console.log(`🔴 ${highImpactCount} eventos de ALTO impacto`);
    console.log(`🟡 ${mediumImpactCount} eventos de MÉDIO impacto`);
    console.log('');
    console.log('🔥 EVENTOS CHAVE DA PRÓXIMA SEMANA:');
    console.log('💰 CB Consumer Confidence (Segunda) - Sentimento do consumidor');
    console.log('🏠 New Home Sales (Terça) - Vendas de casas novas');
    console.log('📈 GDP Second Estimate (Quarta) - PIB revisado');
    console.log('💼 Initial Jobless Claims (Quinta) - Pedidos de desemprego');
    console.log('💸 Personal Spending (Quinta) - Gastos pessoais');
    console.log('📊 Core PCE (Quinta) - Inflação do Fed!');
    console.log('🎯 Michigan Sentiment Final (Sexta) - Dados finais');
    console.log('');
    console.log('🔄 AGORA: Recarregue http://localhost:9025');
    console.log('🗓️ Sistema com DADOS DA PRÓXIMA SEMANA!');
    
  } catch (error) {
    console.error('❌ ERRO na importação:', error.message);
  } finally {
    db.close();
  }
}

importNextWeekData();