import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';

console.log('📅 IMPORTANDO DADOS REAIS DO INVESTING.COM...');

const db = new sqlite3.Database('./data/alerts.db');
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Função para fazer fetch da página real do Investing.com
async function fetchInvestingData() {
  try {
    console.log('🌐 Acessando Investing.com para capturar dados reais...');
    
    const response = await fetch('/api/widget-visible-data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.events && data.events.length > 0) {
      console.log(`✅ ${data.events.length} eventos capturados do widget real`);
      return data.events;
    } else {
      console.log('⚠️ Nenhum evento encontrado no widget');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro ao acessar dados do widget:', error.message);
    return [];
  }
}

async function importRealData() {
  try {
    console.log('🗑️ Limpando banco...');
    await db.runAsync('DELETE FROM events');
    
    // Capturar dados reais do Investing.com
    const realEvents = await fetchInvestingData();
    
    if (realEvents.length === 0) {
      console.log('❌ Nenhum evento real encontrado. Verifique se o widget está funcionando.');
      return;
    }
    
    console.log(`💾 Inserindo ${realEvents.length} eventos REAIS do Investing.com...`);
    
    let insertedCount = 0;
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    let lowImpactCount = 0;
    
    for (const event of realEvents) {
      try {
        // Converter dados do widget para formato do banco
        const eventDate = event.time ? 
          moment.tz(`2025-08-21 ${event.time}`, 'YYYY-MM-DD HH:mm', 'America/New_York').utc().format() :
          new Date().toISOString();
        
        await db.runAsync(
          `INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            event.name || 'Evento sem nome',
            eventDate,
            event.impact || 'medium',
            event.forecast || '',
            event.previous || '',
            event.actual || null
          ]
        );
        
        insertedCount++;
        
        // Contar por impacto
        if (event.impact === 'high') highImpactCount++;
        else if (event.impact === 'medium') mediumImpactCount++;
        else lowImpactCount++;
        
        console.log(`✅ ${event.name}`);
        console.log(`   Horário: ${event.time || 'N/A'} ET - ${event.impact || 'medium'} impact`);
        console.log(`   Previsão: ${event.forecast || 'N/A'} | Anterior: ${event.previous || 'N/A'}`);
        if (event.actual) {
          console.log(`   Atual: ${event.actual}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao inserir ${event.name}: ${error.message}`);
      }
    }
    
    console.log('📊 RESUMO DA IMPORTAÇÃO REAL:');
    console.log(`✅ ${insertedCount} eventos REAIS inseridos`);
    console.log(`🔴 ${highImpactCount} eventos de ALTO impacto`);
    console.log(`🟡 ${mediumImpactCount} eventos de MÉDIO impacto`);
    console.log(`⚪ ${lowImpactCount} eventos de BAIXO impacto`);
    console.log('');
    console.log('📋 FONTE: Dados capturados diretamente do widget Investing.com');
    console.log('🔄 AGORA: Recarregue http://localhost:9025');
    console.log('✨ Sistema com DADOS 100% REAIS!');
    
  } catch (error) {
    console.error('❌ ERRO na importação:', error.message);
  } finally {
    db.close();
  }
}

importRealData();