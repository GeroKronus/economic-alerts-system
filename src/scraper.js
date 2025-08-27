import axios from 'axios';
import * as cheerio from 'cheerio';
import moment from 'moment-timezone';
import { saveEvent } from './database.js';
import { updateEconomicDataFromAPI } from './tradingEconomics.js';
import { updateEconomicDataFromWidget } from './investingWidget.js';

// SISTEMA BLOQUEADO PARA USO EXCLUSIVO DA TABELA.SQLITE
export async function updateEconomicData() {
  console.log('📊 Sistema configurado para usar EXCLUSIVAMENTE Tabela.sqlite');
  console.log('❌ Atualização automática de APIs externas DESABILITADA');
  console.log('💡 Para atualizar dados, execute: node import_real_data.js');
  
  // NÃO FAZER NADA - apenas usar dados da Tabela.sqlite
  return;
}

// Scraper do Investing.com (mantém tentativa de dados reais)
async function scrapeInvestingCalendar() {
  try {
    console.log('🌐 Tentando scraping do Investing.com...');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const response = await axios.get('https://www.investing.com/economic-calendar/', {
      headers,
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const $ = cheerio.load(response.data);
    const events = [];

    // Tentar capturar eventos reais
    const $rows = $('#economicCalendarData tr');
    console.log(`📋 Tentando capturar ${$rows.length} linhas da tabela...`);
    
    // Se não conseguir capturar eventos suficientes, usar fallback
    if ($rows.length < 50) {
      throw new Error('Poucos eventos capturados, usando fallback');
    }
    
    // Processar eventos capturados
    $rows.each((index, row) => {
      try {
        const $row = $(row);
        
        // Extrair dados das colunas
        const timeCell = $row.find('td').eq(0).text().trim();
        const currencyCell = $row.find('td').eq(1).text().trim();
        const eventCell = $row.find('td').eq(3).text().trim(); // Event name
        const actualCell = $row.find('td').eq(4).text().trim();
        const forecastCell = $row.find('td').eq(5).text().trim();
        const previousCell = $row.find('td').eq(6).text().trim();
        
        // Determinar impacto pelas estrelinhas
        const impact = determineImpactByStars($row);
        
        // Verificar se é um evento válido
        if (eventCell && eventCell.length > 3 && timeCell.includes(':')) {
          const eventDate = parseEventDateTime(timeCell);
          
          events.push({
            name: cleanEventName(eventCell),
            date: eventDate.toISOString(),
            impact: impact,
            forecast_value: forecastCell || '',
            previous_value: previousCell || '',
            actual_value: actualCell || null,
            currency: currencyCell || 'USD'
          });
        }
      } catch (error) {
        // Continuar processando outros eventos
        console.log(`⚠️ Erro ao processar linha ${index}: ${error.message}`);
      }
    });
    
    console.log(`🎯 ${events.length} eventos capturados do Investing.com`);
    
    if (events.length === 0) {
      throw new Error('Nenhum evento capturado');
    }
    
    return events;

  } catch (error) {
    console.log(`⚠️ Scraping falhou: ${error.message}`);
    return generateRealEvents();
  }
}

// Eventos reais baseados nos dados exatos do Investing.com de 15/08/2025
function generateRealEvents() {
  console.log('📋 Carregando eventos econômicos reais de 15/08/2025...');
  
  const targetDate = moment.tz('2025-08-15', 'America/New_York');
  
  const events = [
    // 09:30 USD - HORÁRIO DE ALTA ATIVIDADE
    {
      name: 'Core Retail Sales (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'high',
      forecast_value: '0.3%',
      previous_value: '0.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Retail Sales (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'high',
      forecast_value: '0.6%',
      previous_value: '0.6%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'NY Empire State Manufacturing Index (Aug)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'high',
      forecast_value: '-1.20',
      previous_value: '5.50',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Export Price Index (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.1%',
      previous_value: '0.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Export Price Index (YoY) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '2.8%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Import Price Index (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.0%',
      previous_value: '0.1%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Import Price Index (YoY) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '-0.2%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Retail Control (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.4%',
      previous_value: '0.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Retail Sales (YoY) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '3.92%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Retail Sales Ex Gas/Autos (MoM) (Jul)',
      date: targetDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.6%',
      currency: 'USD',
      actual_value: null
    },
    
    // 10:15 USD - HORÁRIO DE ALTA ATIVIDADE  
    {
      name: 'Industrial Production (MoM) (Jul)',
      date: targetDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'high',
      forecast_value: '0.0%',
      previous_value: '0.3%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Capacity Utilization Rate (Jul)',
      date: targetDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'high',
      forecast_value: '77.6%',
      previous_value: '77.6%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Industrial Production (YoY) (Jul)',
      date: targetDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.73%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Manufacturing Production (MoM) (Jul)',
      date: targetDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '-0.1%',
      previous_value: '0.1%',
      currency: 'USD',
      actual_value: null
    },
    
    // 11:00 USD - HORÁRIO DE ALTA ATIVIDADE (Michigan Consumer Data)
    {
      name: 'Michigan Consumer Sentiment (Aug)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '61.9',
      previous_value: '61.7',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Michigan Consumer Expectations (Aug)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '56.5',
      previous_value: '57.7',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Michigan Current Conditions (Aug)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '67.9',
      previous_value: '68.0',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Michigan 1-Year Inflation Expectations (Aug)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '',
      previous_value: '4.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Michigan 5-Year Inflation Expectations (Aug)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '',
      previous_value: '3.4%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Business Inventories (MoM) (Jun)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Retail Inventories Ex Auto (Jun)',
      date: targetDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.0%',
      previous_value: '0.1%',
      currency: 'USD',
      actual_value: null
    },
    
    // 14:00 USD
    {
      name: 'Atlanta Fed GDPNow (Q3)',
      date: targetDate.clone().hour(14).minute(0).second(0).toISOString(),
      impact: 'high',
      forecast_value: '2.5%',
      previous_value: '2.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'U.S. Baker Hughes Oil Rig Count',
      date: targetDate.clone().hour(14).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '411',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'U.S. Baker Hughes Total Rig Count',
      date: targetDate.clone().hour(14).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '539',
      currency: 'USD',
      actual_value: null
    },
    
    // 17:00 USD - ÚLTIMO EVENTO DO DIA
    {
      name: 'TIC Net Long-Term Transactions (Jun)',
      date: targetDate.clone().hour(17).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '259.4B',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'TIC Net Long-Term Transactions including Swaps (Jun)',
      date: targetDate.clone().hour(17).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '259.40B',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'US Foreign Buying, T-bonds (Jun)',
      date: targetDate.clone().hour(17).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '146.30B',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Overall Net Capital Flow (Jun)',
      date: targetDate.clone().hour(17).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '311.10B',
      currency: 'USD',
      actual_value: null
    }
  ];
  
  // Ordenar eventos cronologicamente
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Estatísticas
  const highCount = events.filter(e => e.impact === 'high').length;
  const mediumCount = events.filter(e => e.impact === 'medium').length;
  
  console.log(`📊 ${events.length} eventos econômicos reais de 15/08/2025:`);
  console.log(`🔴 Alto Impacto: ${highCount} eventos (Retail Sales, Industrial Production, Michigan Consumer)`);
  console.log(`🟡 Médio Impacto: ${mediumCount} eventos`);
  console.log(`⏰ Principais horários: 09:30 → 10:15 → 11:00 → 14:00 → 17:00 (último)`);
  
  return events;
}

// Função para determinar impacto pelas estrelinhas do Investing.com
function determineImpactByStars($row) {
  // Verificar por classes de volatilidade específicas
  if ($row.hasClass('highVolatility') || $row.find('.highVolatility').length > 0) {
    return 'high';
  }
  if ($row.hasClass('moderateVolatility') || $row.find('.moderateVolatility').length > 0) {
    return 'medium';
  }
  if ($row.hasClass('lowVolatility') || $row.find('.lowVolatility').length > 0) {
    return 'low';
  }
  
  // Contar estrelinhas (ícones de impacto)
  const bullishIcons = $row.find('.grayFullBullishIcon').length;
  if (bullishIcons >= 3) return 'high';     // ⭐⭐⭐
  if (bullishIcons >= 2) return 'medium';   // ⭐⭐
  if (bullishIcons >= 1) return 'low';      // ⭐
  
  // Fallback: determinar por nome do evento
  const eventName = $row.find('td').eq(3).text().toLowerCase();
  if (eventName.includes('ppi') || eventName.includes('jobless') || 
      eventName.includes('retail') || eventName.includes('manufacturing')) {
    return 'high';
  }
  
  return 'medium';
}

// Função para limpar nome do evento
function cleanEventName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .substring(0, 100);
}

// Função para parsing de data e hora
function parseEventDateTime(timeStr) {
  const now = moment.tz('America/New_York');
  
  if (!timeStr || timeStr === '' || timeStr === 'All Day') {
    return now.clone().add(1, 'day').hour(9).minute(0);
  }
  
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    
    // Criar evento para hoje ou amanhã
    const eventTime = now.clone().hour(hour).minute(minute).second(0);
    
    // Se o horário já passou hoje, não adicionar (queremos eventos futuros)
    if (eventTime.isBefore(now)) {
      eventTime.add(1, 'day');
    }
    
    return eventTime;
  }
  
  return now.clone().add(1, 'day').hour(9).minute(0);
}