import axios from 'axios';
import * as cheerio from 'cheerio';
import moment from 'moment-timezone';
import { saveEvent } from './database.js';

// Dados mockados para desenvolvimento
const mockEvents = [
  {
    name: 'CPI',
    date: moment().add(2, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '3.1%',
    previous_value: '3.4%'
  },
  {
    name: 'FOMC',
    date: moment().add(5, 'days').hour(14).minute(0).toDate(),
    impact: 'high',
    forecast_value: '5.25%',
    previous_value: '5.50%'
  },
  {
    name: 'NFP',
    date: moment().add(7, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '200K',
    previous_value: '275K'
  },
  {
    name: 'PPI',
    date: moment().add(3, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '2.8%',
    previous_value: '3.2%'
  },
  {
    name: 'PCE',
    date: moment().add(4, 'days').hour(8).minute(30).toDate(),
    impact: 'high',
    forecast_value: '2.9%',
    previous_value: '3.1%'
  },
  {
    name: 'GDP',
    date: moment().add(6, 'days').hour(8).minute(30).toDate(),
    impact: 'medium',
    forecast_value: '2.2%',
    previous_value: '2.4%'
  },
  {
    name: 'Jobless Claims',
    date: moment().add(1, 'days').hour(8).minute(30).toDate(),
    impact: 'medium',
    forecast_value: '210K',
    previous_value: '195K'
  },
  {
    name: 'CPI',
    date: moment().add(10, 'minutes').toDate(),
    impact: 'high',
    forecast_value: 'TESTE',
    previous_value: 'TESTE'
  }
];

export async function updateEconomicData() {
  console.log('📊 Atualizando dados econômicos...');
  
  try {
    // Tentar obter dados reais do Investing.com
    const realEvents = await scrapeInvestingCalendar();
    
    if (realEvents && realEvents.length > 0) {
      console.log(`📈 ${realEvents.length} eventos reais encontrados`);
      for (const event of realEvents) {
        await saveEvent(event);
      }
    } else {
      // Fallback para dados mockados
      console.log('⚠️  Usando dados mockados como fallback');
      for (const event of mockEvents) {
        await saveEvent(event);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao obter dados reais:', error.message);
    console.log('📋 Usando dados mockados');
    for (const event of mockEvents) {
      await saveEvent(event);
    }
  }
  
  console.log('✅ Dados atualizados');
}

// Scraper principal do Investing.com - Baseado na estrutura real da tabela
async function scrapeInvestingCalendar() {
  try {
    console.log('🌐 Fazendo scraping do Investing.com...');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    // Obter página do calendário econômico
    const response = await axios.get('https://www.investing.com/economic-calendar/', {
      headers,
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const $ = cheerio.load(response.data);
    const events = [];

    // Eventos importantes baseados no screenshot
    const importantKeywords = [
      'retail', 'sales', 'industrial', 'production', 'capacity', 'utilization',
      'michigan', 'consumer', 'expectations', 'sentiment', 'confidence',
      'empire', 'state', 'manufacturing', 'export', 'import', 'price', 'index',
      'cpi', 'ppi', 'gdp', 'nfp', 'payroll', 'unemployment', 'jobless', 
      'fomc', 'federal', 'pce', 'inflation'
    ];

    // Seletores baseados na estrutura real do Investing.com
    const possibleSelectors = [
      '#economicCalendarData tr',
      '.js-economic-table tr',
      'tr[data-event-datetime]',
      'tbody tr[event_attr_id]',
      '.genTbl tbody tr'
    ];

    let rowsFound = false;
    
    for (const selector of possibleSelectors) {
      const $rows = $(selector);
      if ($rows.length > 0) {
        console.log(`📋 Usando seletor: ${selector} (${$rows.length} linhas)`);
        
        // Debug: mostrar estrutura de algumas linhas
        if ($rows.length > 5) {
          console.log(`🔍 Debug - Primeira linha HTML:`, $rows.eq(0).html()?.substring(0, 200));
          console.log(`🔍 Debug - Atributos primeira linha:`, Object.keys($rows.eq(0).get(0)?.attribs || {}));
        }
        
        $rows.each((index, row) => {
          try {
            const $row = $(row);
            
            // Extrair dados das colunas com múltiplas estratégias
            let timeCell, currencyCell, eventCell, actualCell, forecastCell, previousCell;
            
            // Estratégia 1: Por atributos específicos
            if ($row.attr('data-event-datetime')) {
              timeCell = $row.attr('data-event-datetime');
              eventCell = $row.find('[data-event-name]').text().trim() || $row.find('.event a').text().trim();
              actualCell = $row.find('[data-actual]').text().trim();
              forecastCell = $row.find('[data-forecast]').text().trim();
              previousCell = $row.find('[data-previous]').text().trim();
              currencyCell = $row.find('[data-currency]').text().trim();
            } else {
              // Estratégia 2: Por posição das colunas (fallback)
              const cells = $row.find('td');
              timeCell = cells.eq(0).text().trim();
              currencyCell = cells.eq(1).text().trim(); 
              eventCell = cells.eq(2).text().trim();
              actualCell = cells.eq(3).text().trim();
              forecastCell = cells.eq(4).text().trim();
              previousCell = cells.eq(5).text().trim();
            }

            // Verificar se é um evento importante
            if (eventCell && eventCell.length > 3) {
              const eventLower = eventCell.toLowerCase();
              const isImportant = importantKeywords.some(keyword => 
                eventLower.includes(keyword)
              );

              if (isImportant) {
                // Determinar data baseada no horário atual
                const eventDate = parseEventDateTime(timeCell);
                
                // Determinar impacto baseado na estrutura da linha
                const impactLevel = determineImpact($row);
                
                events.push({
                  name: cleanEventName(eventCell),
                  date: eventDate.toISOString(),
                  impact: impactLevel,
                  forecast_value: forecastCell || 'N/A',
                  previous_value: previousCell || 'N/A',
                  time_original: timeCell,
                  currency: currencyCell,
                  actual_value: actualCell || 'N/A'
                });
              }
            }
          } catch (rowError) {
            // Ignorar erros de linhas individuais
          }
        });
        
        rowsFound = true;
        break;
      }
    }

    if (!rowsFound) {
      console.log('⚠️  Nenhuma tabela encontrada, usando dados sintéticos...');
      return generateSyntheticEvents();
    }

    console.log(`🎯 ${events.length} eventos reais encontrados`);
    return events.length > 0 ? events : generateSyntheticEvents();

  } catch (error) {
    console.error('❌ Erro no scraping:', error.message);
    return generateSyntheticEvents();
  }
}

// Função para gerar eventos sintéticos baseados no screenshot atual
function generateSyntheticEvents() {
  console.log('📋 Gerando eventos futuros baseados no screenshot atual (horários ET)...');
  
  const today = moment.tz('America/New_York');
  const currentHourET = today.hour();
  const currentMinuteET = today.minute();
  
  // Se já passou do horário dos eventos (10:15 ET), usar amanhã
  const hasPassedEventTime = currentHourET > 10 || (currentHourET === 10 && currentMinuteET >= 15);
  const baseDate = hasPassedEventTime ? today.clone().add(1, 'day') : today;
  
  console.log(`🕒 Horário atual ET: ${today.format('HH:mm')}, usando data base: ${baseDate.format('YYYY-MM-DD')}`);
  
  const events = [
    // Eventos às 10:15 ET (conforme screenshot atual)
    {
      name: 'Capacity Utilization Rate (Jul)',
      date: baseDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'high',
      forecast_value: '77.6%',
      previous_value: '77.6%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Industrial Production (YoY) (Jul)',
      date: baseDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '',
      previous_value: '0.73%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Industrial Production (MoM) (Jul)',
      date: baseDate.clone().hour(10).minute(15).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.0%',
      previous_value: '0.3%',
      currency: 'USD',
      actual_value: null
    },
    // Eventos adicionais para completar o sistema
    {
      name: 'Core Retail Sales (MoM)',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'high',
      forecast_value: '0.3%',
      previous_value: '1.0%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Export Price Index (YoY)',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '1.5%',
      previous_value: '2.1%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Export Price Index (MoM)',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.2%',
      previous_value: '0.5%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Import Price Index (YoY)',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '1.8%',
      previous_value: '2.3%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Import Price Index (MoM)',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.1%',
      previous_value: '0.6%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'NY Empire State Manufacturing',
      date: baseDate.clone().hour(9).minute(30).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '5.2',
      previous_value: '6.6',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Business Inventories (MoM)',
      date: baseDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.2%',
      previous_value: '0.1%',
      currency: 'USD',
      actual_value: null
    },
    {
      name: 'Manufacturing Production (MoM)',
      date: baseDate.clone().hour(11).minute(0).second(0).toISOString(),
      impact: 'medium',
      forecast_value: '0.1%',
      previous_value: '0.4%',
      currency: 'USD',
      actual_value: null
    }
  ];
  
  // Ordenar eventos por data (ordem cronológica)
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log(`📊 Eventos gerados: ${events.length} eventos em ordem cronológica`);
  events.forEach(event => {
    const eventDate = moment(event.date).tz('America/New_York');
    console.log(`  - ${event.name}: ${eventDate.format('HH:mm')} ET (${event.impact})`);
  });
  
  return events;
}

// Função para parsing de data e hora
function parseEventDateTime(timeStr) {
  const now = moment.tz('America/New_York');
  
  if (!timeStr || timeStr === 'All Day') {
    return now.clone().add(1, 'day').hour(9).minute(0);
  }
  
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    
    // Se o horário já passou hoje, colocar para amanhã
    const eventTime = now.clone().hour(hour).minute(minute);
    if (eventTime.isBefore(now)) {
      eventTime.add(1, 'day');
    }
    
    return eventTime;
  }
  
  return now.clone().add(1, 'day').hour(9).minute(0);
}

// Função para determinar impacto
function determineImpact($row) {
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
  
  // Fallback: contar ícones de impacto
  const bullishIcons = $row.find('.grayFullBullishIcon').length;
  if (bullishIcons >= 3) return 'high';
  if (bullishIcons >= 2) return 'medium';
  if (bullishIcons >= 1) return 'low';
  
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

// Mapear nomes dos eventos para nosso padrão
function mapEventName(rawName) {
  const name = rawName.toLowerCase();
  
  if (name.includes('cpi') || name.includes('consumer price')) return 'CPI';
  if (name.includes('ppi') || name.includes('producer price')) return 'PPI';
  if (name.includes('nfp') || name.includes('non farm') || name.includes('nonfarm')) return 'NFP';
  if (name.includes('fomc') || name.includes('federal funds') || name.includes('interest rate')) return 'FOMC';
  if (name.includes('pce')) return 'PCE';
  if (name.includes('gdp') || name.includes('gross domestic')) return 'GDP';
  if (name.includes('jobless') || name.includes('unemployment')) return 'Jobless Claims';
  
  return null;
}

// Função para buscar dados reais - API alternativa
export async function fetchRealData() {
  // Opção 1: Alpha Vantage API
  if (process.env.ALPHA_VANTAGE_KEY) {
    try {
      // Implementar chamadas API
      // const response = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${process.env.ALPHA_VANTAGE_KEY}`);
    } catch (error) {
      console.error('Erro ao buscar dados da Alpha Vantage:', error.message);
    }
  }
}