import cron from 'node-cron';
import telegram from './telegram.js';
import { getActiveAlerts, getUpcomingEvents, saveSentMessage, wasRecentlySent, getEventsToday, getImpactAlerts } from './database.js';
import { updateEconomicData } from './scraper.js';
import moment from 'moment-timezone';

export function initScheduler() {
  console.log('🚀 Iniciando scheduler de alertas...');
  
  // DESABILITADO: Atualização automática de APIs externas
  // Usar apenas dados da Tabela.sqlite
  console.log('📊 Sistema configurado para usar apenas Tabela.sqlite');
  
  // Verificar alertas a cada 1 minuto (para suportar alertas de poucos minutos)
  cron.schedule('* * * * *', async () => {
    console.log('🔍 Verificando alertas...');
    await checkAlerts();
  });

  // DESABILITADO: Atualização automática de dados externos
  // Os dados devem vir apenas da Tabela.sqlite

  // Enviar resumo diário às 8h
  cron.schedule('0 8 * * *', async () => {
    console.log('📅 Enviando resumo diário...');
    await sendDailySummary();
  });
}

async function checkAlerts() {
  // Verificar alertas por categoria de impacto
  const impactAlerts = await getImpactAlerts();
  const events = await getUpcomingEvents();
  
  console.log(`📋 Verificando ${impactAlerts.length} alertas de categoria para ${events.length} eventos`);
  
  // Agrupar eventos por chat_id, impact_level, hours_before e horário do evento
  const groupedAlerts = new Map();
  
  for (const event of events) {
    for (const alert of impactAlerts) {
      if (!alert.chat_id) continue;
      
      // Verificar se o impacto do evento corresponde ao alerta
      if (alert.impact_level !== event.impact) continue;
      
      // Usar fuso horário do usuário para cálculo de alertas
      const eventDate = moment.utc(event.date);
      const now = moment.utc();
      const hoursUntilEvent = eventDate.diff(now, 'hours', true);
      
      console.log(`⏰ Evento: ${event.name} | Data UTC: ${eventDate.format('YYYY-MM-DD HH:mm')} | Agora UTC: ${now.format('YYYY-MM-DD HH:mm')} | Horas restantes: ${hoursUntilEvent.toFixed(2)}h`);
      
      // Verificar se está na janela de tempo para enviar o alerta
      if (hoursUntilEvent <= alert.hours_before && 
          hoursUntilEvent > alert.hours_before - 0.02) { // ~1.2 minutos de janela
        
        // Verificar se já foi enviado
        const recentlySent = await wasRecentlySent(event.id, alert.id);
        if (recentlySent) {
          console.log(`⚠️ Alerta já enviado: ${event.name} (${alert.hours_before}h antes)`);
          continue;
        }
        
        // Criar chave para agrupar eventos do mesmo horário
        const eventTime = eventDate.format('HH:mm');
        const groupKey = `${alert.chat_id}_${eventTime}`;
        
        if (!groupedAlerts.has(groupKey)) {
          groupedAlerts.set(groupKey, {
            chatId: alert.chat_id,
            alert: alert,
            eventTime: eventTime,
            events: []
          });
        }
        
        groupedAlerts.get(groupKey).events.push(event);
      }
    }
  }
  
  // Enviar alertas agrupados
  for (const [groupKey, group] of groupedAlerts) {
    console.log(`🚨 Enviando alerta agrupado para ${group.events.length} eventos às ${group.eventTime}`);
    const result = await telegram.sendGroupedAlert(group.chatId, group.events, group.alert);
    
    // Registrar envio para todos os eventos do grupo
    for (const event of group.events) {
      await saveSentMessage({
        event_id: event.id,
        alert_id: group.alert.id,
        message: `Grouped alert sent for ${event.name} (${group.alert.impact_level})`,
        status: result.success ? 'sent' : 'failed',
        chat_id: group.chatId
      });
    }
  }
  
  // REMOVIDO: Alertas específicos para evitar mensagens duplas
  // Apenas alertas por categoria de impacto são usados
}

async function sendDailySummary() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  
  const todayEvents = await getEventsToday();
  if (todayEvents.length === 0) return;
  
  let message = '☀️ *Bom dia! Eventos de hoje:*\n\n';
  
  todayEvents.forEach(event => {
    const time = moment(event.date).format('HH:mm');
    const emoji = event.impact === 'high' ? '🔴' : '🟡';
    message += `${emoji} ${time} - *${event.name}*\n`;
  });
  
  message += '\n_Tenha um ótimo dia de trading!_';
  
  await telegram.sendMessage(chatId, message);
}