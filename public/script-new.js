// Sistema de Abas
let currentTab = 'calendar';

// Função para enviar logs para o servidor
function debugLog(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${type}] ${message}`);
    
    // Enviar para o servidor
    fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, timestamp, type })
    }).catch(err => console.error('Erro ao enviar log:', err));
}

function switchTab(tabName) {
    // Remover active de todas as abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ativar aba selecionada
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Carregar dados específicos da aba
    if (tabName === 'calendar') {
        loadCalendarEvents();
    } else if (tabName === 'alerts') {
        loadAlerts();
    } else if (tabName === 'logs') {
        loadLogs();
    } else if (tabName === 'data') {
        loadDataStats();
    }
}

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadCalendarEvents();
    loadDataStats();
    
    // Atualizar a cada 30 segundos
    setInterval(() => {
        if (currentTab === 'calendar') {
            loadCalendarEvents();
        } else if (currentTab === 'logs') {
            loadLogs();
        }
    }, 30000);
});

// Função para carregar eventos do calendário
async function loadCalendarEvents() {
    try {
        const response = await fetch('/api/all-events');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog(`Dados recebidos: ${data.events.length} eventos`, 'LOAD_EVENTS');
        const container = document.getElementById('calendar-events');
        
        if (!data.success || data.events.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <p>Nenhum evento encontrado na Tabela.sqlite</p>
                </div>
            `;
            return;
        }

        // Filtrar eventos baseado nos checkboxes
        const filteredEvents = data.events.filter(event => {
            const filterHigh = document.getElementById('filterHigh');
            const filterMedium = document.getElementById('filterMedium');
            const filterLow = document.getElementById('filterLow');
            
            if (!filterHigh || !filterMedium || !filterLow) {
                return true;
            }
            
            const showHigh = filterHigh.checked;
            const showMedium = filterMedium.checked;
            const showLow = filterLow.checked;
            
            let impactLevel = 'low';
            
            // O impact vem como string ("high", "medium", "low") da Tabela.sqlite
            if (event.impact === 'high') impactLevel = 'high';
            else if (event.impact === 'medium') impactLevel = 'medium';
            else impactLevel = 'low';
            
            const shouldShow = (showHigh && impactLevel === 'high') || 
                              (showMedium && impactLevel === 'medium') || 
                              (showLow && impactLevel === 'low');
            
            // Debug para eventos do dia 22
            if (event.date.includes('2025-08-22')) {
                debugLog(`Evento 22/08: ${event.name} | Impacto: ${event.impact} -> ${impactLevel} | Mostrar: ${shouldShow} | Filtros: H:${showHigh} M:${showMedium} L:${showLow}`, 'FILTER_EVENT');
            }
            
            return shouldShow;
        });
        
        if (filteredEvents.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <p>Nenhum evento encontrado para os filtros selecionados</p>
                </div>
            `;
            return;
        }

        // Agrupar eventos por data
        const eventsByDate = {};
        filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const dateKey = eventDate.toISOString().split('T')[0];
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
            
            // Debug para o dia 22
            if (dateKey === '2025-08-22') {
                debugLog(`Agrupado para 22/08: ${event.name} em ${dateKey}`, 'GROUP_EVENT');
            }
        });
        
        debugLog(`Eventos agrupados por data: ${Object.keys(eventsByDate).map(key => `${key}: ${eventsByDate[key].length} eventos`).join(', ')}`, 'GROUP_SUMMARY');

        let htmlContent = '';
        
        try {
            debugLog(`Iniciando renderização de ${Object.keys(eventsByDate).length} datas`, 'RENDER_INIT');
        } catch (e) {
            debugLog(`Erro no log inicial: ${e.message}`, 'ERROR');
        }
        
        Object.entries(eventsByDate).forEach(([dateKey, events]) => {
            try {
                // Debug para o dia 22
                if (dateKey === '2025-08-22') {
                    debugLog(`Renderizando ${events.length} eventos para ${dateKey}`, 'RENDER_START');
                }
                
                // Separador de data
                const dateObj = new Date(dateKey);
                const dateOptions = { 
                    timeZone: 'America/Sao_Paulo',
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'
                };
                const dateFormatter = new Intl.DateTimeFormat('pt-BR', dateOptions);
                const dateString = dateFormatter.format(dateObj);
            } catch (dateError) {
                debugLog(`Erro na formatação de data para ${dateKey}: ${dateError.message}`, 'ERROR');
                return;
            }
            
            htmlContent += `<div class="date-separator">📅 ${dateString}</div>`;
            
            // Eventos do dia
            events.forEach((event, index) => {
                if (dateKey === '2025-08-22') {
                    debugLog(`Renderizando evento ${index + 1}/${events.length}: ${event.name}`, 'RENDER_EVENT');
                }
                const eventDate = new Date(event.date);
                
                // Horário no Brasil
                const timeOptions = { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                };
                const brTime = new Intl.DateTimeFormat('pt-BR', timeOptions).format(eventDate);
                
                // Determinar nível de impacto
                let impactStars = '⭐';
                let impactClass = 'low';
                let impactText = 'Baixo';
                
                if (event.impact === 'high') {
                    impactStars = '⭐⭐⭐';
                    impactClass = 'high';
                    impactText = 'Alto';
                } else if (event.impact === 'medium') {
                    impactStars = '⭐⭐';
                    impactClass = 'medium';
                    impactText = 'Médio';
                }
                
                htmlContent += `
                    <div class="event-card ${impactClass}-impact">
                        <div class="event-header">
                            <div class="event-name">${event.name}</div>
                            <div class="event-time">${brTime} BR</div>
                            <div class="event-impact ${impactClass}">${impactStars} ${impactText}</div>
                        </div>
                        
                        <div class="event-values">
                            <div class="value-box ${event.actual_value ? 'actual' : 'empty'}">
                                <div class="value-label">📊 Atual</div>
                                <div class="value-number">${event.actual_value || '—'}</div>
                            </div>
                            
                            <div class="value-box ${event.forecast_value ? 'forecast' : 'empty'}">
                                <div class="value-label">📈 Previsão</div>
                                <div class="value-number">${event.forecast_value || '—'}</div>
                            </div>
                            
                            <div class="value-box ${event.previous_value ? 'previous' : 'empty'}">
                                <div class="value-label">📉 Anterior</div>
                                <div class="value-number">${event.previous_value || '—'}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        });
        
        debugLog(`HTML final gerado com ${htmlContent.length} caracteres`, 'RENDER_COMPLETE');
        container.innerHTML = htmlContent;
        
    } catch (error) {
        console.error('Erro ao carregar eventos do calendário:', error);
        document.getElementById('calendar-events').innerHTML = `
            <div class="loading-state">
                <p>Erro ao carregar eventos da Tabela.sqlite</p>
            </div>
        `;
    }
}

// Função para filtrar eventos baseado nos checkboxes
function filterEventsByImpact(events) {
    const filterHigh = document.getElementById('filterHigh');
    const filterMedium = document.getElementById('filterMedium');
    const filterLow = document.getElementById('filterLow');
    
    if (!filterHigh || !filterMedium || !filterLow) {
        return events;
    }
    
    const showHigh = filterHigh.checked;
    const showMedium = filterMedium.checked;
    const showLow = filterLow.checked;
    
    return events.filter(event => {
        // Converter impacto numérico para string
        let impactLevel = 'low';
        const impactNumber = parseInt(event.impact) || 1;
        
        if (impactNumber >= 3) impactLevel = 'high';
        else if (impactNumber >= 2) impactLevel = 'medium';
        
        if (showHigh && impactLevel === 'high') return true;
        if (showMedium && impactLevel === 'medium') return true;
        if (showLow && impactLevel === 'low') return true;
        return false;
    });
}

// Chamada quando os filtros de impacto mudam
function filterEventsByImpact() {
    loadCalendarEvents();
}

// Função para carregar alertas
async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        const container = document.getElementById('alertsList');
        
        const hasImpactAlerts = data.impactAlerts && data.impactAlerts.length > 0;
        const hasRegularAlerts = data.alerts && data.alerts.length > 0;
        
        if (!hasImpactAlerts && !hasRegularAlerts) {
            container.innerHTML = '<div class="loading-state">Nenhum alerta configurado</div>';
            return;
        }
        
        let html = '';
        
        if (hasImpactAlerts) {
            html += '<div class="alerts-group">';
            html += '<h4>🔔 Alertas por Categoria de Impacto</h4>';
            
            data.impactAlerts.forEach(alert => {
                const hoursText = alert.hours_before < 1 ? 
                    `${alert.hours_before * 60} minutos` : 
                    `${alert.hours_before} horas`;
                
                let impactIcon = '⚪';
                let impactText = 'Baixo Impacto';
                
                if (alert.impact_level === 'high') {
                    impactIcon = '🔴';
                    impactText = 'Alto Impacto';
                } else if (alert.impact_level === 'medium') {
                    impactIcon = '🟡';
                    impactText = 'Médio Impacto';
                }
                
                html += `
                    <div class="alert-item">
                        <strong>${impactIcon} ${impactText}</strong> - 
                        Alertar ${hoursText} antes de TODOS os eventos desta categoria
                    </div>
                `;
            });
            html += '</div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        document.getElementById('alertsList').innerHTML = 
            '<div class="loading-state">Erro ao carregar alertas</div>';
    }
}

// Função para carregar logs
async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        const container = document.getElementById('logsList');
        
        if (!data.success || data.logs.length === 0) {
            container.innerHTML = '<div class="loading-state">Nenhuma mensagem enviada ainda</div>';
            return;
        }
        
        container.innerHTML = data.logs.slice(0, 10).map(log => {
            const date = new Date(log.sent_at);
            const statusClass = log.status === 'sent' ? 'success' : 'danger';
            const statusText = log.status === 'sent' ? 'Enviado' : 'Falhou';
            const statusIcon = log.status === 'sent' ? '✅' : '❌';
            
            return `
                <div class="log-item">
                    <div class="log-header">
                        <span class="log-time">${date.toLocaleString('pt-BR')}</span>
                        <span class="log-status ${statusClass}">${statusIcon} ${statusText}</span>
                    </div>
                    <div class="log-message">${log.message}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        document.getElementById('logsList').innerHTML = 
            '<div class="loading-state">Erro ao carregar logs</div>';
    }
}

// Função para carregar estatísticas de dados
async function loadDataStats() {
    try {
        const response = await fetch('/api/all-events');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.events) {
            let totalEvents = data.events.length;
            let highImpact = 0;
            let mediumImpact = 0;
            let lowImpact = 0;
            
            data.events.forEach(event => {
                if (event.impact === 'high') highImpact++;
                else if (event.impact === 'medium') mediumImpact++;
                else lowImpact++;
            });
            
            // Atualizar estatísticas
            const statCards = document.querySelectorAll('.stat-card .stat-number');
            if (statCards.length >= 4) {
                statCards[0].textContent = totalEvents;
                statCards[1].textContent = highImpact;
                statCards[2].textContent = mediumImpact;
                statCards[3].textContent = lowImpact;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Função para recarregar dados da Tabela.sqlite
async function reloadSQLiteData() {
    const confirmation = confirm('🔄 Recarregar dados da Tabela.sqlite?\n\nIsto irá:\n1. Substituir todos os eventos atuais\n2. Carregar dados do arquivo Tabela.sqlite\n3. Manter os alertas configurados\n\nContinuar?');
    
    if (!confirmation) return;

    try {
        showMessage('🔄 Recarregando dados da Tabela.sqlite...', 'info');
        
        const response = await fetch('/api/reload-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(
                `✅ Dados recarregados!\n📊 ${data.eventsImported} eventos\n🔴 ${data.breakdown.high} alto\n🟡 ${data.breakdown.medium} médio\n⚪ ${data.breakdown.low} baixo`, 
                'success'
            );
            
            // Recarregar dados na interface
            setTimeout(() => {
                loadCalendarEvents();
                loadDataStats();
            }, 1000);
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao recarregar dados'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao recarregar dados SQLite:', error);
        showMessage('❌ Erro de conexão ao recarregar dados.', 'error');
    }
}

// Função para verificar status da Tabela.sqlite
async function checkSQLiteStatus() {
    try {
        const response = await fetch('/api/sqlite-status');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.tabelaExists) {
                showMessage(`✅ Tabela.sqlite encontrada!\n📁 ${data.filePath}\n🔄 Pronto para importação`, 'success');
            } else {
                showMessage(`⚠️ Tabela.sqlite não encontrada!\n📁 ${data.filePath}\n💡 Coloque na pasta raiz`, 'error');
            }
        } else {
            showMessage(`❌ Erro: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao verificar status SQLite:', error);
        showMessage('❌ Erro de conexão ao verificar status.', 'error');
    }
}

// Função para salvar configuração de alertas
async function saveAlertConfig() {
    try {
        const alertTime = document.getElementById('alertTime').value;
        const highImpact = document.getElementById('highImpact').checked;
        const mediumImpact = document.getElementById('mediumImpact').checked;
        const lowImpact = document.getElementById('lowImpact').checked;
        if (!highImpact && !mediumImpact && !lowImpact) {
            showMessage('⚠️ Selecione pelo menos um nível de impacto', 'error');
            return;
        }
        
        const impactLevels = [];
        if (highImpact) impactLevels.push('high');
        if (mediumImpact) impactLevels.push('medium');
        if (lowImpact) impactLevels.push('low');
        
        const response = await fetch('/api/create-impact-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                impact_levels: impactLevels,
                hours_before: parseFloat(alertTime)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const levels = [];
            if (highImpact) levels.push('alto impacto');
            if (mediumImpact) levels.push('médio impacto');
            if (lowImpact) levels.push('baixo impacto');
            
            showMessage(
                `✅ Alertas configurados! Eventos de ${levels.join(' e ')} (${alertTime}h antes)`,
                'success'
            );
            loadAlerts();
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao criar alertas'}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        showMessage('❌ Erro ao salvar configuração', 'error');
    }
}

// Função para testar alerta
async function testAlert() {
    try {
        const response = await fetch('/api/test-alert', { 
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.success) {
            showMessage('✅ Alerta de teste enviado! Verifique seu Telegram.', 'success');
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao enviar alerta'}`, 'error');
        }
    } catch (error) {
        showMessage('❌ Erro de conexão ao enviar alerta de teste.', 'error');
    }
}

// Função para limpar todos os alertas
async function clearAllAlerts() {
    const confirmation = confirm('⚠️ Tem certeza que deseja remover TODOS os alertas configurados?');
    
    if (!confirmation) return;
    
    try {
        const response = await fetch('/api/clear-alerts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ ${data.deletedCount || 0} alertas removidos com sucesso!`, 'success');
            loadAlerts();
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao remover alertas'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao limpar alertas:', error);
        showMessage('❌ Erro de conexão ao limpar alertas.', 'error');
    }
}

// Função para mostrar mensagens
function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        white-space: pre-line;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}