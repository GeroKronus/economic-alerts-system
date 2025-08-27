import { initDB, saveEvent } from './src/database.js';

async function createTestEvent() {
  await initDB();
  
  const now = new Date();
  const testTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos à frente
  
  const event = {
    name: "🧪 TESTE 10MIN - Sistema Funcional",
    date: testTime.toISOString(),
    impact: "high", 
    forecast_value: "2.2%",
    previous_value: "2.1%"
  };
  
  await saveEvent(event);
  console.log(`✅ Evento criado para: ${testTime.toISOString()}`);
  console.log(`⏰ Horário Brasil: ${new Date(testTime.getTime() - 3*60*60*1000).toLocaleString('pt-BR')}`);
  console.log(`🚨 Alerta esperado em: ${new Date(testTime.getTime() - 3*60*60*1000 - 2*60*1000).toLocaleString('pt-BR')} (2 minutos antes)`);
  console.log(`📊 Sistema enviará alerta quando restarem 2 minutos para o evento`);
  process.exit(0);
}

createTestEvent().catch(console.error);