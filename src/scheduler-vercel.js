import telegram from './telegram.js';
import { getImpactAlerts, getUpcomingEvents, saveSentMessage, wasRecentlySent } from './database.js';
import moment from 'moment-timezone';

// Versão do scheduler para Vercel (sem cron nativo)
export async function checkAlerts() {
  try {
    // Verificar alertas por categoria de impacto
    const impactAlerts = await getImpactAlerts();
    const events = await getUpcomingEvents();
    
    console.log(`📋 Verificando ${impactAlerts.length} alertas de categoria para ${events.length} eventos`);
    
    // Agrupar eventos por chat_id e horário do evento
    const groupedAlerts = new Map();
    
    for (const event of events) {
      for (const alert of impactAlerts) {
        if (!alert.chat_id) continue;
        
        // Verificar se o impacto do evento corresponde ao alerta
        if (alert.impact_level !== event.impact) continue;
        
        // Usar fuso horário UTC para cálculo de alertas
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
    
    return { success: true, alertsProcessed: groupedAlerts.size };
  } catch (error) {
    console.error('❌ Erro ao verificar alertas:', error);
    throw error;
  }
}

// Para compatibilidade com o sistema atual
export function initScheduler() {
  console.log('📊 Scheduler Vercel iniciado - usando webhook externo para cron');
  console.log('🔗 Configure webhook: https://seu-projeto.vercel.app/api/cron-alerts');
  console.log('⏰ Intervalo recomendado: A cada 1 minuto');
}