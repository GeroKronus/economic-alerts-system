import axios from 'axios';
import * as cheerio from 'cheerio';
import moment from 'moment-timezone';
import { saveEvent } from './database.js';

// Função para capturar dados do widget do Investing.com
export async function scrapeInvestingWidget() {
  try {
    console.log('📊 Capturando dados do widget Investing.com...');
    
    // URL do widget direto (sem iframe)
    const widgetUrl = 'https://sslecal2.investing.com';
    const params = {
      columns: 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous',
      features: 'datepicker,timezone',
      countries: '5', // USA
      calType: 'week',
      timeZone: '12', // ET
      lang: '1' // English
    };
    
    const response = await axios.get(widgetUrl, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Encontrar todas as linhas de eventos
    $('tr[data-event-datetime], tr.js-event-item, tr[id*="eventRowId"]').each((index, row) => {
      try {
        const $row = $(row);
        
        // Extrair informações básicas
        const timeText = $row.find('td').eq(0).text().trim();
        const currency = $row.find('td').eq(1).text().trim();
        const eventName = $row.find('td').eq(2).text().trim() || $row.find('.event').text().trim();
        const actual = $row.find('td').eq(3).text().trim();
        const forecast = $row.find('td').eq(4).text().trim();
        const previous = $row.find('td').eq(5).text().trim();
        
        // Determinar impacto pelas classes CSS ou ícones
        let impact = 'medium';
        const impactCell = $row.find('td').eq(2); // Coluna de importância
        
        if (impactCell.find('.grayFullBullishIcon').length >= 3) {
          impact = 'high';
        } else if (impactCell.find('.grayFullBullishIcon').length >= 2) {
          impact = 'medium';
        } else if (impactCell.find('.grayFullBullishIcon').length >= 1) {
          impact = 'low';
        }
        
        // Verificar por classes de volatilidade
        if ($row.hasClass('highVolatility') || impactCell.hasClass('highVolatility')) {
          impact = 'high';
        } else if ($row.hasClass('moderateVolatility') || impactCell.hasClass('moderateVolatility')) {
          impact = 'medium';
        } else if ($row.hasClass('lowVolatility') || impactCell.hasClass('lowVolatility')) {
          impact = 'low';
        }
        
        // Classificação por nome (fallback)
        if (eventName) {
          const eventLower = eventName.toLowerCase();
          
          // Alto impacto
          if (eventLower.includes('cpi') || eventLower.includes('ppi') || 
              eventLower.includes('retail sales') || eventLower.includes('jobless claims') ||
              eventLower.includes('nonfarm') || eventLower.includes('unemployment') ||
              eventLower.includes('fomc') || eventLower.includes('gdp') ||
              eventLower.includes('michigan consumer') || eventLower.includes('industrial production')) {
            impact = 'high';
          }
          
          // Médio impacto  
          else if (eventLower.includes('housing') || eventLower.includes('manufacturing') ||
                   eventLower.includes('business inventories') || eventLower.includes('trade balance') ||
                   eventLower.includes('capacity utilization') || eventLower.includes('empire state')) {
            impact = 'medium';
          }
        }
        
        // Só processar se tiver nome do evento e moeda
        if (eventName && eventName.length > 3 && currency) {
          // Parse da data/hora
          const eventDate = parseWidgetDateTime(timeText);
          
          const event = {
            name: cleanEventName(eventName),
            date: eventDate.toISOString(),
            impact: impact,
            forecast_value: forecast || '',
            previous_value: previous || '',
            actual_value: actual || null,
            currency: currency || 'USD',
            country: 'United States',
            source: 'investing_widget'
          };
          
          events.push(event);
        }
        
      } catch (error) {
        console.log(`⚠️ Erro ao processar linha ${index}: ${error.message}`);
      }
    });
    
    console.log(`📊 ${events.length} eventos capturados do widget Investing.com`);
    
    // Salvar eventos únicos
    const savedCount = await saveUniqueEvents(events);
    console.log(`💾 ${savedCount} eventos salvos no banco de dados`);
    
    return events;
    
  } catch (error) {
    console.error('❌ Erro ao capturar widget Investing.com:', error.message);
    return [];
  }
}

// Função para parsing de data/hora do widget
function parseWidgetDateTime(timeText) {
  const now = moment.tz('America/New_York');
  
  if (!timeText || timeText.includes('All Day')) {
    return now.clone().add(1, 'hour');
  }
  
  // Formato esperado: "09:30" ou "14:00"
  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    
    let eventTime = now.clone().hour(hour).minute(minute).second(0);
    
    // Se já passou, usar próximo dia
    if (eventTime.isBefore(now)) {
      eventTime.add(1, 'day');
    }
    
    return eventTime;
  }
  
  return now.clone().add(1, 'hour');
}

// Função para limpar nome do evento
function cleanEventName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/^\s*[\d\.\-\+%]+\s*/, '') // Remove números no início
    .replace(/\([^)]*\)$/, '') // Remove parênteses no final
    .trim()
    .substring(0, 100);
}

// Função para salvar apenas eventos únicos
async function saveUniqueEvents(events) {
  let savedCount = 0;
  
  for (const event of events) {
    try {
      // Verificar se evento já existe (mesmo nome + mesmo dia)
      const eventDay = moment(event.date).format('YYYY-MM-DD');
      const existing = await checkEventExists(event.name, eventDay);
      
      if (!existing) {
        await saveEvent(event);
        savedCount++;
      }
    } catch (error) {
      console.log(`⚠️ Erro ao salvar evento ${event.name}: ${error.message}`);
    }
  }
  
  return savedCount;
}

// Função para verificar se evento já existe
async function checkEventExists(eventName, eventDay) {
  // Implementação simples - na prática você verificaria no banco
  // Por agora, assumimos que não existe para permitir atualizações
  return false;
}

// Função para atualizar dados via widget
export async function updateEconomicDataFromWidget() {
  console.log('📊 Atualizando dados via widget Investing.com...');
  
  try {
    const events = await scrapeInvestingWidget();
    
    if (events.length > 0) {
      console.log(`✅ ${events.length} eventos capturados do widget oficial`);
      return events;
    } else {
      console.log('⚠️ Nenhum evento capturado do widget, usando fallback');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar via widget:', error.message);
    return null;
  }
}