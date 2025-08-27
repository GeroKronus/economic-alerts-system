import { initDB, saveEvent } from './src/database.js';

async function createTestEvent() {
  await initDB();
  
  const now = new Date();
  const testTime = new Date(now.getTime() + 4 * 60 * 1000); // 4 minutos à frente
  
  const event = {
    name: "🧪 TIMEZONE FIXED - Teste Final",
    date: testTime.toISOString(),
    impact: "high", 
    forecast_value: "2.1%",
    previous_value: "2.0%"
  };
  
  await saveEvent(event);
  console.log(`✅ Evento criado para: ${testTime.toISOString()}`);
  console.log(`⏰ Horário Brasil: ${new Date(testTime.getTime() - 3*60*60*1000).toLocaleString('pt-BR')}`);
  console.log(`🚨 Alertas esperados em: ${new Date(testTime.getTime() - 3*60*60*1000 - 2*60*1000).toLocaleString('pt-BR')} (2min antes) e ${new Date(testTime.getTime() - 3*60*60*1000 - 1*60*1000).toLocaleString('pt-BR')} (1min antes)`);
  process.exit(0);
}

createTestEvent().catch(console.error);