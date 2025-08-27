import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { saveAlert, getActiveAlerts, getUpcomingEvents } from './database.js';

dotenv.config();

class TelegramService {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.log('⚠️  TELEGRAM_BOT_TOKEN não configurado');
      return;
    }
    
    try {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
        polling: { 
          interval: 1000,
          autoStart: true,
          params: {
            timeout: 10
          }
        }
      });
      
      this.bot.on('polling_error', (error) => {
        console.log('🔄 Erro de polling Telegram:', error.code);
        if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
          console.log('⚠️  Múltiplas instâncias detectadas - reiniciando polling...');
          setTimeout(() => {
            this.bot.stopPolling();
            setTimeout(() => this.bot.startPolling(), 2000);
          }, 5000);
        }
      });

      this.setupCommands();
    } catch (error) {
      console.error('❌ Erro ao inicializar bot Telegram:', error.message);
    }
  }

  setupCommands() {
    if (!this.bot) return;
    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const message = 
        `🚀 *Bem-vindo ao Crypto Economic Alerts!*\n\n` +
        `Seu Chat ID: \`${chatId}\`\n\n` +
        `Comandos disponíveis:\n` +
        `/proximos - Ver próximos eventos\n` +
        `/alertas - Ver alertas configurados\n` +
        `/adicionar - Adicionar novo alerta\n` +
        `/remover - Remover alerta\n` +
        `/ajuda - Ver esta mensagem\n\n` +
        `Configure seu Chat ID no arquivo .env para receber alertas automáticos!`;
      
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /proximos
    this.bot.onText(/\/proximos/, async (msg) => {
      const chatId = msg.chat.id;
      const events = await getUpcomingEvents();
      
      if (events.length === 0) {
        this.bot.sendMessage(chatId, '📅 Nenhum evento próximo encontrado.');
        return;
      }

      let message = '📊 *Próximos Eventos Econômicos:*\n\n';
      
      events.slice(0, 10).forEach(event => {
        const date = new Date(event.date);
        const emoji = event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢';
        
        message += `${emoji} *${event.name}*\n`;
        message += `📅 ${date.toLocaleString('pt-BR')}\n`;
        message += `📈 Previsão: ${event.forecast_value || 'N/A'}\n`;
        message += `📉 Anterior: ${event.previous_value || 'N/A'}\n\n`;
      });

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /alertas
    this.bot.onText(/\/alertas/, async (msg) => {
      const chatId = msg.chat.id;
      const alerts = await getActiveAlerts();
      const userAlerts = alerts.filter(a => a.chat_id === chatId.toString());
      
      if (userAlerts.length === 0) {
        this.bot.sendMessage(chatId, '🔔 Você não tem alertas configurados. Use /adicionar para criar um.');
        return;
      }

      let message = '🔔 *Seus Alertas Configurados:*\n\n';
      
      userAlerts.forEach((alert, index) => {
        message += `${index + 1}. *${alert.event_type}*\n`;
        message += `   ⏰ ${alert.hours_before} horas antes\n\n`;
      });

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /adicionar
    this.bot.onText(/\/adicionar/, (msg) => {
      const chatId = msg.chat.id;
      
      // Criar teclado inline com opções de eventos
      const keyboard = {
        inline_keyboard: [
          [
            { text: 'CPI', callback_data: 'add_CPI' },
            { text: 'PPI', callback_data: 'add_PPI' },
            { text: 'NFP', callback_data: 'add_NFP' }
          ],
          [
            { text: 'FOMC', callback_data: 'add_FOMC' },
            { text: 'PCE', callback_data: 'add_PCE' },
            { text: 'GDP', callback_data: 'add_GDP' }
          ],
          [
            { text: 'Jobless Claims', callback_data: 'add_JOBLESS' }
          ]
        ]
      };

      this.bot.sendMessage(
        chatId, 
        '📊 Selecione o evento para adicionar alerta:', 
        { reply_markup: keyboard }
      );
    });

    // Handler para callbacks do teclado inline
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const data = callbackQuery.data;
      const chatId = msg.chat.id;

      if (data.startsWith('add_')) {
        const eventType = data.replace('add_', '');
        
        // Teclado para selecionar tempo
        const timeKeyboard = {
          inline_keyboard: [
            [
              { text: '1 semana', callback_data: `time_${eventType}_168` },
              { text: '3 dias', callback_data: `time_${eventType}_72` }
            ],
            [
              { text: '1 dia', callback_data: `time_${eventType}_24` },
              { text: '12 horas', callback_data: `time_${eventType}_12` }
            ],
            [
              { text: '1 hora', callback_data: `time_${eventType}_1` },
              { text: '30 min', callback_data: `time_${eventType}_0.5` }
            ]
          ]
        };

        this.bot.editMessageText(
          `⏰ Quando você quer ser alertado sobre *${eventType}*?`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: timeKeyboard,
            parse_mode: 'Markdown'
          }
        );
      }

      if (data.startsWith('time_')) {
        const parts = data.split('_');
        const eventType = parts[1];
        const hours = parseFloat(parts[2]);

        // Salvar alerta
        await saveAlert({
          event_type: eventType,
          hours_before: hours,
          chat_id: chatId.toString(),
          message_template: null
        });

        this.bot.editMessageText(
          `✅ Alerta criado!\n\n` +
          `📊 Evento: *${eventType}*\n` +
          `⏰ Aviso: *${hours}* horas antes`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
      }

      // Responder ao callback para remover o "loading"
      this.bot.answerCallbackQuery(callbackQuery.id);
    });

    // Comando /ajuda
    this.bot.onText(/\/ajuda/, (msg) => {
      const chatId = msg.chat.id;
      const message = 
        `📚 *Central de Ajuda*\n\n` +
        `🤖 *Comandos disponíveis:*\n\n` +
        `/start - Obter seu Chat ID\n` +
        `/proximos - Listar próximos eventos econômicos\n` +
        `/alertas - Ver seus alertas configurados\n` +
        `/adicionar - Criar novo alerta\n` +
        `/remover - Remover alerta existente\n` +
        `/ajuda - Mostrar esta mensagem\n\n` +
        `💡 *Dicas:*\n` +
        `• Os alertas são enviados automaticamente\n` +
        `• Você pode ter múltiplos alertas para o mesmo evento\n` +
        `• Eventos de alto impacto são marcados com 🔴\n\n` +
        `📊 *Eventos monitorados:*\n` +
        `CPI, PPI, NFP, FOMC, PCE, GDP, Jobless Claims`;

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  async sendMessage(chatId, text) {
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      console.log('✅ Mensagem Telegram enviada');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAlert(chatId, event, alert) {
    const emoji = event.impact === 'high' ? '🚨' : '⚠️';
    const hoursText = alert.hours_before < 1 ? 
      `${Math.round(alert.hours_before * 60)} minutos` : 
      `${Math.round(alert.hours_before)} horas`;

    const message = 
      `${emoji} *ALERTA ECONÔMICO*\n\n` +
      `📊 *${event.name}*\n` +
      `⏰ Em *${hoursText}*\n` +
      `📅 ${new Date(event.date).toLocaleString('pt-BR')}\n\n` +
      `📈 Previsão: ${event.forecast_value || 'N/A'}\n` +
      `📉 Anterior: ${event.previous_value || 'N/A'}\n` +
      `⚡ Impacto: ${event.impact?.toUpperCase() || 'N/A'}\n\n` +
      `💡 Prepare-se para possível volatilidade!`;

    return this.sendMessage(chatId, message);
  }

  async sendGroupedAlert(chatId, events, alert) {
    const hoursText = alert.hours_before < 1 ? 
      `${Math.round(alert.hours_before * 60)} minutos` : 
      `${Math.round(alert.hours_before)} horas`;

    // Agrupar por horário
    const eventsByTime = events.reduce((groups, event) => {
      const time = new Date(event.date).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      if (!groups[time]) groups[time] = [];
      groups[time].push(event);
      return groups;
    }, {});

    let message = `🚨 *ALERTAS ECONÔMICOS*\n\n`;
    message += `⏰ Em *${hoursText}*\n\n`;

    // Para cada horário, listar os eventos
    for (const [time, timeEvents] of Object.entries(eventsByTime)) {
      timeEvents.forEach(event => {
        const impactEmoji = event.impact === 'high' ? '⭐⭐⭐' : 
                          event.impact === 'medium' ? '⭐⭐' : '⭐';
        
        message += `${time}    USD    ${impactEmoji}    ${event.name}    ${event.forecast_value || '—'}    ${event.previous_value || '—'}    ${event.actual_value || ''}\n`;
      });
    }

    message += `\n💡 Prepare-se para possível volatilidade!`;

    return this.sendMessage(chatId, message);
  }
}

export default new TelegramService();