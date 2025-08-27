import axios from 'axios';
import moment from 'moment-timezone';
import { saveEvent } from './database.js';

// Trading Economics API configuration
const TRADING_ECONOMICS_BASE_URL = 'https://api.tradingeconomics.com';

// Função principal para obter dados da Trading Economics API
export async function updateEconomicDataFromAPI(apiKey = null) {
  try {
    console.log('📊 Buscando dados da Trading Economics API...');
    
    if (!apiKey) {
      console.log('⚠️ API Key não fornecida, usando dados de fallback');
      return await useFallbackEvents();
    }
    
    // Buscar calendário econômico dos EUA para os próximos 7 dias
    const events = await fetchEconomicCalendar(apiKey);
    
    console.log(`📈 ${events.length} eventos obtidos da Trading Economics API`);
    
    // Salvar eventos no banco
    for (const event of events) {
      await saveEvent(event);
    }
    
    return events;
    
  } catch (error) {
    console.error('❌ Erro na Trading Economics API:', error.message);
    console.log('📋 Usando dados de fallback...');
    return await useFallbackEvents();
  }
}

// Buscar calendário econômico
async function fetchEconomicCalendar(apiKey) {
  try {
    const today = moment().format('YYYY-MM-DD');
    const nextWeek = moment().add(7, 'days').format('YYYY-MM-DD');
    
    // Endpoint da Trading Economics para calendário dos EUA
    const url = `${TRADING_ECONOMICS_BASE_URL}/calendar/country/united-states/${today}/${nextWeek}`;
    
    const response = await axios.get(url, {
      params: {
        c: apiKey, // Client key
        f: 'json'
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EconomicAlertsBot/1.0'
      },
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`Trading Economics API retornou status ${response.status}`);
    }
    
    const rawEvents = response.data;
    console.log(`🔍 ${rawEvents.length} eventos brutos recebidos da API`);
    
    // Processar e filtrar eventos
    const processedEvents = rawEvents
      .filter(event => isRelevantEvent(event))
      .map(event => transformEventData(event))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return processedEvents;
    
  } catch (error) {
    console.error('❌ Erro ao buscar calendário:', error.message);
    throw error;
  }
}

// Verificar se o evento é relevante
function isRelevantEvent(event) {
  // Filtrar apenas eventos dos EUA com importância
  if (event.Country !== 'United States') return false;
  if (!event.Event) return false;
  
  // Eventos importantes por palavra-chave
  const importantKeywords = [
    'CPI', 'PPI', 'GDP', 'Employment', 'Jobless', 'Unemployment',
    'Retail Sales', 'Industrial Production', 'Manufacturing',
    'Consumer Sentiment', 'Michigan', 'FOMC', 'Fed', 'Interest Rate',
    'Capacity Utilization', 'Business Inventories', 'Trade Balance',
    'Empire State', 'Inflation', 'PCE', 'Nonfarm Payrolls'
  ];
  
  const eventName = event.Event.toLowerCase();
  return importantKeywords.some(keyword => 
    eventName.includes(keyword.toLowerCase())
  );
}

// Transformar dados da API para nosso formato
function transformEventData(event) {
  return {
    name: cleanEventName(event.Event),
    date: moment.tz(event.Date, 'YYYY-MM-DDTHH:mm:ss', 'America/New_York').toISOString(),
    impact: determineImpactFromAPI(event),
    forecast_value: event.Forecast ? String(event.Forecast) : '',
    previous_value: event.Previous ? String(event.Previous) : '',
    actual_value: event.Actual ? String(event.Actual) : null,
    currency: event.Currency || 'USD',
    country: event.Country,
    category: event.Category || 'Economic Indicator'
  };
}

// Determinar impacto baseado nos dados da API
function determineImpactFromAPI(event) {
  // Trading Economics usa Importance: Low, Medium, High
  if (event.Importance) {
    const importance = event.Importance.toLowerCase();
    if (importance === 'high') return 'high';
    if (importance === 'medium') return 'medium';
    return 'low';
  }
  
  // Fallback baseado no nome do evento
  const eventName = event.Event.toLowerCase();
  
  // Alto impacto
  const highImpactEvents = [
    'consumer price index', 'cpi', 'producer price index', 'ppi',
    'gross domestic product', 'gdp', 'nonfarm payrolls', 'employment',
    'federal funds rate', 'fomc', 'retail sales', 'industrial production',
    'michigan consumer sentiment', 'unemployment rate'
  ];
  
  // Médio impacto
  const mediumImpactEvents = [
    'capacity utilization', 'business inventories', 'manufacturing',
    'trade balance', 'empire state', 'jobless claims', 'housing'
  ];
  
  if (highImpactEvents.some(keyword => eventName.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactEvents.some(keyword => eventName.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

// Limpar nome do evento
function cleanEventName(name) {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

// Dados de fallback baseados nos dados reais completos do Investing.com
async function useFallbackEvents() {
  console.log('📋 Carregando dados econômicos COMPLETOS da semana (11-15 Agosto 2025)...');
  
  const events = [
    // ========== SEGUNDA, 11/08/2025 ==========
    {
      name: '3-Month Bill Auction',
      date: moment.tz('2025-08-11 12:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'low',
      forecast_value: '',
      previous_value: '4.165%',
      actual_value: '4.150%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: '6-Month Bill Auction',
      date: moment.tz('2025-08-11 12:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'low',
      forecast_value: '',
      previous_value: '3.980%',
      actual_value: '3.970%',
      currency: 'USD',
      country: 'United States'
    },

    // ========== TERÇA, 12/08/2025 - CPI DAY ==========
    {
      name: 'NFIB Small Business Optimism (Jul)',
      date: moment.tz('2025-08-12 07:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '98.9',
      previous_value: '98.6',
      actual_value: '100.3',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Consumer Price Index (CPI) (MoM) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.2%',
      previous_value: '0.3%',
      actual_value: '0.2%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Consumer Price Index (CPI) (MoM) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.3%',
      previous_value: '0.2%',
      actual_value: '0.3%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Consumer Price Index (CPI) (YoY) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.8%',
      previous_value: '2.7%',
      actual_value: '2.7%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Consumer Price Index (CPI) (YoY) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '3.0%',
      previous_value: '2.9%',
      actual_value: '3.1%', // ACIMA DO ESPERADO!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'CPI Index, n.s.a. (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '323.17',
      previous_value: '322.56',
      actual_value: '323.05',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Real Earnings (MoM) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '-0.3%',
      actual_value: '0.4%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Cleveland CPI (MoM) (Jul)',
      date: moment.tz('2025-08-12 12:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.3%',
      actual_value: '0.3%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Federal Budget Balance (Jul)',
      date: moment.tz('2025-08-12 15:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '-206.7B',
      previous_value: '27.0B',
      actual_value: '-291.0B',
      currency: 'USD',
      country: 'United States'
    },

    // ========== QUARTA, 13/08/2025 ==========
    {
      name: 'MBA 30-Year Mortgage Rate',
      date: moment.tz('2025-08-13 08:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '6.77%',
      actual_value: '6.67%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'MBA Mortgage Applications (WoW)',
      date: moment.tz('2025-08-13 08:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '3.1%',
      actual_value: '10.9%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Crude Oil Inventories',
      date: moment.tz('2025-08-13 11:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '-0.900M',
      previous_value: '-3.029M',
      actual_value: '3.036M',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Gasoline Inventories',
      date: moment.tz('2025-08-13 11:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '-1.000M',
      previous_value: '-1.323M',
      actual_value: '-0.792M',
      currency: 'USD',
      country: 'United States'
    },

    // ========== QUINTA, 14/08/2025 - PPI DAY (HOJE) ==========
    {
      name: 'Initial Jobless Claims',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '225K',
      previous_value: '227K',
      actual_value: '224K',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Continuing Jobless Claims',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '1,960K',
      previous_value: '1,968K',
      actual_value: '1,953K',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Producer Price Index (PPI) (MoM) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      actual_value: '0.9%', // 🚨 SURPRESA ENORME!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Producer Price Index (PPI) (MoM) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      actual_value: '0.9%', // 🚨 SURPRESA ENORME!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Producer Price Index (PPI) (YoY) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.5%',
      previous_value: '2.4%',
      actual_value: '3.3%', // Bem acima!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Producer Price Index (PPI) (YoY) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.9%',
      previous_value: '2.6%',
      actual_value: '3.7%', // Bem acima!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'PPI ex. Food/Energy/Transport (MoM) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.0%',
      actual_value: '0.6%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'PPI ex. Food/Energy/Transport (YoY) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '2.5%',
      actual_value: '2.8%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Natural Gas Storage',
      date: moment.tz('2025-08-14 11:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '53B',
      previous_value: '7B',
      actual_value: '56B',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: '4-Week Bill Auction',
      date: moment.tz('2025-08-14 12:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'low',
      forecast_value: '',
      previous_value: '4.300%',
      actual_value: '4.280%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: '8-Week Bill Auction',
      date: moment.tz('2025-08-14 12:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'low',
      forecast_value: '',
      previous_value: '4.235%',
      actual_value: '4.185%',
      currency: 'USD',
      country: 'United States'
    },

    // ========== SEXTA, 15/08/2025 - RETAIL SALES DAY (AMANHÃ) ==========
    {
      name: 'Retail Sales (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.6%',
      previous_value: '0.6%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Retail Sales (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.3%',
      previous_value: '0.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Retail Control (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '0.4%',
      previous_value: '0.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'NY Empire State Manufacturing Index (Aug)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '-1.20',
      previous_value: '5.50',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Export Price Index (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '0.1%',
      previous_value: '0.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Export Price Index (YoY) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '2.8%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Import Price Index (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '0.0%',
      previous_value: '0.1%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Import Price Index (YoY) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '-0.2%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Retail Sales (YoY) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '3.92%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Retail Sales Ex Gas/Autos (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.6%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    
    // 10:15 Events
    {
      name: 'Industrial Production (MoM) (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.0%',
      previous_value: '0.3%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Capacity Utilization Rate (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '77.6%',
      previous_value: '77.6%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Industrial Production (YoY) (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.73%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Manufacturing Production (MoM) (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '-0.1%',
      previous_value: '0.1%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    
    // 11:00 Events - Michigan Consumer Data
    {
      name: 'Michigan Consumer Sentiment (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '61.9',
      previous_value: '61.7',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Michigan Consumer Expectations (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '56.5',
      previous_value: '57.7',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Michigan Current Conditions (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '67.9',
      previous_value: '68.0',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Michigan 1-Year Inflation Expectations (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '',
      previous_value: '4.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Michigan 5-Year Inflation Expectations (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '',
      previous_value: '3.4%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Business Inventories (MoM) (Jun)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Retail Inventories Ex Auto (Jun)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '0.0%',
      previous_value: '0.1%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    
    // 14:00 Events
    {
      name: 'Atlanta Fed GDPNow (Q3)',
      date: moment.tz('2025-08-15 14:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.5%',
      previous_value: '2.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'U.S. Baker Hughes Oil Rig Count',
      date: moment.tz('2025-08-15 14:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '411',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'U.S. Baker Hughes Total Rig Count',
      date: moment.tz('2025-08-15 14:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '539',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    
    // 17:00 Events - Últimos do dia
    {
      name: 'TIC Net Long-Term Transactions (Jun)',
      date: moment.tz('2025-08-15 17:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '259.4B',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'TIC Net Long-Term Transactions including Swaps (Jun)',
      date: moment.tz('2025-08-15 17:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '259.40B',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'US Foreign Buying, T-bonds (Jun)',
      date: moment.tz('2025-08-15 17:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '146.30B',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Overall Net Capital Flow (Jun)',
      date: moment.tz('2025-08-15 17:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '311.10B',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Consumer Price Index (CPI) (YoY) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.8%',
      previous_value: '2.7%',
      actual_value: '2.7%',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Consumer Price Index (CPI) (YoY) (Jul)',
      date: moment.tz('2025-08-12 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '3.0%',
      previous_value: '2.9%',
      actual_value: '3.1%',
      currency: 'USD',
      country: 'United States'
    },
    
    // Quinta-feira, 14/08/2025 - PPI Day (HOJE)
    {
      name: 'Producer Price Index (PPI) (MoM) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      actual_value: '0.9%', // SURPRESA ENORME!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Producer Price Index (PPI) (MoM) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.2%',
      previous_value: '0.0%',
      actual_value: '0.9%', // SURPRESA ENORME!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Producer Price Index (PPI) (YoY) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.5%',
      previous_value: '2.4%',
      actual_value: '3.3%', // Bem acima!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Producer Price Index (PPI) (YoY) (Jul)',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '2.9%',
      previous_value: '2.6%',
      actual_value: '3.7%', // Bem acima!
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Initial Jobless Claims',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '225K',
      previous_value: '227K',
      actual_value: '224K',
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Continuing Jobless Claims',
      date: moment.tz('2025-08-14 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'medium',
      forecast_value: '1,960K',
      previous_value: '1,968K',
      actual_value: '1,953K',
      currency: 'USD',
      country: 'United States'
    },
    
    // Sexta-feira, 15/08/2025 - Retail Sales Day (AMANHÃ)
    {
      name: 'Retail Sales (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.6%',
      previous_value: '0.6%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Core Retail Sales (MoM) (Jul)',
      date: moment.tz('2025-08-15 09:30', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.3%',
      previous_value: '0.5%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Industrial Production (MoM) (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '0.0%',
      previous_value: '0.3%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Capacity Utilization Rate (Jul)',
      date: moment.tz('2025-08-15 10:15', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '77.6%',
      previous_value: '77.6%',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    },
    {
      name: 'Michigan Consumer Sentiment (Aug)',
      date: moment.tz('2025-08-15 11:00', 'YYYY-MM-DD HH:mm', 'America/New_York').toISOString(),
      impact: 'high',
      forecast_value: '61.9',
      previous_value: '61.7',
      actual_value: null,
      currency: 'USD',
      country: 'United States'
    }
  ];
  
  // Ordenar eventos cronologicamente
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Salvar eventos
  for (const event of events) {
    await saveEvent(event);
  }
  
  // Estatísticas
  const highCount = events.filter(e => e.impact === 'high').length;
  const mediumCount = events.filter(e => e.impact === 'medium').length;
  const lowCount = events.filter(e => e.impact === 'low').length;
  
  console.log(`📊 ${events.length} eventos econômicos COMPLETOS da semana registrados:`);
  console.log(`🔴 Alto Impacto: ${highCount} eventos (CPI, PPI, Retail Sales, Michigan Consumer)`);
  console.log(`🟡 Médio Impacto: ${mediumCount} eventos`);
  console.log(`⚪ Baixo Impacto: ${lowCount} eventos`);  
  console.log(`📈 Destaques: CPI (Terça), PPI SURPRESAS ENORMES (Hoje), Retail Sales (Amanhã)`);
  
  return events;
}

// Função para teste da API (opcional)
export async function testTradingEconomicsAPI(apiKey) {
  try {
    const url = `${TRADING_ECONOMICS_BASE_URL}/country/united-states`;
    const response = await axios.get(url, {
      params: { c: apiKey, f: 'json' },
      timeout: 5000
    });
    
    console.log('✅ Trading Economics API funcionando');
    return true;
  } catch (error) {
    console.log('❌ Trading Economics API não acessível:', error.message);
    return false;
  }
}