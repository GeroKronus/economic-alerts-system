import { initDB, saveEvent } from './src/database.js';

async function createTestEvent() {
  await initDB();
  
  const now = new Date();
  const testTime = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutos à frente
  
  const event = {
    name: "🧪 PPI Final Test - Sistema Funcional",
    date: testTime.toISOString(),
    impact: "high", 
    forecast_value: "2.1%",
    previous_value: "2.0%"
  };
  
  await saveEvent(event);
  console.log(`✅ Evento criado para: ${testTime.toISOString()}`);
  console.log(`⏰ Horário Brasil: ${new Date(testTime.getTime() - 3*60*60*1000).toLocaleString('pt-BR')}`);
  process.exit(0);
}

createTestEvent().catch(console.error);