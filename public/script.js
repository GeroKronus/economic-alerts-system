// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    loadChronologicalEvents();
    loadAlerts();
    loadLogs();
    
    // Adicionar listeners para os checkboxes de impacto
    const highImpactCheckbox = document.getElementById('highImpact');
    const mediumImpactCheckbox = document.getElementById('mediumImpact');
    const lowImpactCheckbox = document.getElementById('lowImpact');
    
    if (highImpactCheckbox && mediumImpactCheckbox && lowImpactCheckbox) {
        highImpactCheckbox.addEventListener('change', loadEvents);
        mediumImpactCheckbox.addEventListener('change', loadEvents);
        lowImpactCheckbox.addEventListener('change', loadEvents);
    }
    
    // Atualizar a cada 30 segundos
    setInterval(() => {
        loadEvents();
        loadChronologicalEvents();
        loadLogs();
    }, 30000);
});

async function loadEvents() {
    try {
        // Primeiro tentar capturar dados EXATOS do widget
        let response = await fetch('/api/widget-visible-data');
        let data;
        let isWidgetData = false;
        
        if (response.ok) {
            data = await response.json();
            if (data.success && data.events.length > 0) {
                console.log('✅ Usando dados EXATOS do widget Investing.com:', data);
                isWidgetData = true;
            } else {
                console.log('⚠️ Widget retornou dados vazios, tentando fallback...');
            }
        }
        
        // Fallback para dados do banco se widget falhar
        if (!isWidgetData) {
            response = await fetch('/api/events');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            data = await response.json();
            console.log('📋 Usando dados do banco (fallback):', data);
        }
        
        const container = document.getElementById('eventsList');
        
        if (!data.success || data.events.length === 0) {
            container.innerHTML = '<p class="empty">Nenhum evento próximo encontrado</p>';
            return;
        }
        
        // Filtrar eventos baseado na seleção dos checkboxes (já inclui ordenação inteligente)
        const filteredEvents = filterEventsByImpact(data.events);
        
        if (filteredEvents.length === 0) {
            container.innerHTML = '<p class="empty">Nenhum evento encontrado para os níveis de impacto selecionados</p>';
            return;
        }
        
        container.innerHTML = filteredEvents.map(event => {
            // Para dados do widget, usar o campo 'time' diretamente
            let displayTime;
            if (isWidgetData && event.time) {
                displayTime = `Hoje ${event.time} (ET)`;
            } else if (event.date) {
                // Para dados do banco, converter para horário do Brasil
                const eventDate = new Date(event.date);
                const options = { 
                    timeZone: 'America/Sao_Paulo',
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                };
                const brFormatter = new Intl.DateTimeFormat('pt-BR', options);
                const brTime = brFormatter.format(eventDate);
                
                // Também mostrar horário ET para referência
                const etOptions = { 
                    timeZone: 'America/New_York',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                };
                const etFormatter = new Intl.DateTimeFormat('pt-BR', etOptions);
                const etTime = etFormatter.format(eventDate);
                
                displayTime = `${brTime} (BR) / ${etTime} (ET)`;
            } else {
                displayTime = 'Horário não disponível';
            }
            
            let impactClass, impactText;
            if (event.impact === 'high') {
                impactClass = 'impact-high';
                impactText = 'Alto Impacto';
            } else if (event.impact === 'medium') {
                impactClass = 'impact-medium';
                impactText = 'Médio Impacto';
            } else {
                impactClass = 'impact-low';
                impactText = 'Baixo Impacto';
            }
            
            return `
                <div class="event-item">
                    <div class="event-header">
                        <span class="event-name">${event.name}</span>
                        <span class="impact-badge ${impactClass}">
                            ${impactText}
                        </span>
                    </div>
                    <div class="event-details">
                        📅 ${displayTime}<br>
                        💱 Moeda: ${event.currency || 'USD'} | 
                        📈 Previsão: ${event.forecast_value || 'N/A'} | 
                        📉 Anterior: ${event.previous_value || 'N/A'}
                        ${event.actual_value ? `<br>📊 Atual: ${event.actual_value}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        document.getElementById('eventsList').innerHTML = 
            '<p class="empty">Erro ao carregar eventos</p>';
    }
}

async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        const container = document.getElementById('alertsList');
        
        // Debug: verificar dados recebidos
        console.log('📊 Dados de alertas recebidos:', data);
        console.log('📋 Impact alerts:', data.impactAlerts);
        console.log('📋 Regular alerts:', data.alerts);
        
        // Verificar se há alertas de categoria de impacto
        const hasImpactAlerts = data.impactAlerts && data.impactAlerts.length > 0;
        const hasRegularAlerts = data.alerts && data.alerts.length > 0;
        
        if (!hasImpactAlerts && !hasRegularAlerts) {
            container.innerHTML = '<p class="empty">Nenhum alerta configurado</p>';
            return;
        }
        
        let html = '';
        
        // Exibir alertas por categoria de impacto
        if (hasImpactAlerts) {
            html += `<div class="chat-group">`;
            html += `<h4>🔔 Alertas por Categoria de Impacto</h4>`;
            
            // Agrupar alertas por categoria
            const alertsByCategory = {};
            data.impactAlerts.forEach(alert => {
                if (!alertsByCategory[alert.impact_level]) {
                    alertsByCategory[alert.impact_level] = [];
                }
                alertsByCategory[alert.impact_level].push(alert);
            });
            
            console.log('🔍 Alertas agrupados por categoria:', alertsByCategory);
            
            // Exibir cada alerta como linha separada
            data.impactAlerts.forEach(alert => {
                const hoursText = alert.hours_before < 1 ? 
                    `${alert.hours_before * 60} minutos` : 
                    `${alert.hours_before} horas`;
                
                const impactIcon = alert.impact_level === 'high' ? '🔴' : '🟡';
                const impactText = alert.impact_level === 'high' ? 'Alto Impacto' : 'Médio Impacto';
                
                html += `
                    <div class="alert-item">
                        <strong>${impactIcon} ${impactText}</strong> - 
                        Alertar ${hoursText} antes de TODOS os eventos desta categoria
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        // Exibir alertas específicos (compatibilidade)
        if (hasRegularAlerts) {
            const alertsByChat = {};
            data.alerts.forEach(alert => {
                // Pular alertas de categoria (já exibidos acima)
                if (alert.impact_level) return;
                
                const chatId = alert.chat_id || 'Sistema';
                if (!alertsByChat[chatId]) {
                    alertsByChat[chatId] = [];
                }
                alertsByChat[chatId].push(alert);
            });
            
            Object.entries(alertsByChat).forEach(([chatId, alerts]) => {
                if (alerts.length > 0) {
                    html += `<div class="chat-group">`;
                    html += `<h4>📋 Alertas Específicos</h4>`;
                    
                    alerts.forEach(alert => {
                        const hoursText = alert.hours_before < 1 ? 
                            `${alert.hours_before * 60} minutos` : 
                            `${alert.hours_before} horas`;
                        
                        html += `
                            <div class="alert-item">
                                <strong>${alert.event_type}</strong> - 
                                Alertar ${hoursText} antes
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
            });
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        document.getElementById('alertsList').innerHTML = 
            '<p class="empty">Erro ao carregar alertas</p>';
    }
}

async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        const container = document.getElementById('logsList');
        
        if (!data.success || data.logs.length === 0) {
            container.innerHTML = '<p class="empty">Nenhuma mensagem enviada ainda</p>';
            return;
        }
        
        container.innerHTML = data.logs.slice(0, 10).map(log => {
            const date = new Date(log.sent_at);
            const statusClass = log.status === 'sent' ? 'sent' : 'failed';
            const statusText = log.status === 'sent' ? 'Enviado' : 'Falhou';
            
            return `
                <div class="log-item">
                    <div class="log-header">
                        <span class="log-time">${date.toLocaleString('pt-BR')}</span>
                        <span class="log-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="log-message">${log.message}</div>
                    ${log.chat_id ? `<div class="log-chat">Chat: ${log.chat_id}</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        document.getElementById('logsList').innerHTML = 
            '<p class="empty">Erro ao carregar logs</p>';
    }
}

async function testAlert(event) {
    const button = event ? event.target : document.querySelector('.btn-primary');
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = 'Enviando...';
    
    try {
        const response = await fetch('/api/test-alert', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Alerta de teste enviado! Verifique seu Telegram.', 'success');
        } else {
            showNotification(`❌ Erro: ${data.error || 'Falha ao enviar alerta'}`, 'error');
        }
    } catch (error) {
        showNotification('❌ Erro de conexão ao enviar alerta de teste.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Estilos da notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
    `;
    
    // Cores baseadas no tipo
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #2196f3, #1976d2)';
    }
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Função para salvar configuração de alerta por categoria de impacto
async function saveAlertConfig() {
    try {
        const alertTime = document.getElementById('alertTime').value;
        const highImpact = document.getElementById('highImpact').checked;
        const mediumImpact = document.getElementById('mediumImpact').checked;
        
        if (!highImpact && !mediumImpact) {
            showMessage('⚠️ Selecione pelo menos um nível de impacto', 'error');
            return;
        }
        
        const hoursText = alertTime < 1 ? `${alertTime * 60} minutos` : `${alertTime} horas`;
        
        // Montar lista de categorias selecionadas
        const impactLevels = [];
        if (highImpact) impactLevels.push('high');
        if (mediumImpact) impactLevels.push('medium');
        
        console.log('🔔 Salvando alertas por categoria:', { impactLevels, alertTime });
        
        // Criar alertas por categoria de impacto
        const response = await fetch('/api/create-impact-alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                impact_levels: impactLevels,
                hours_before: parseFloat(alertTime),
                chat_id: '7336659270'
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
            
            showMessage(
                `✅ Alertas configurados! Você receberá alertas de TODOS os eventos de ${levels.join(' e ')} (${hoursText} antes)`,
                'success'
            );
            loadAlerts(); // Recarregar lista de alertas
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao criar alertas'}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        showMessage('❌ Erro ao salvar configuração', 'error');
    }
}

// Função para mostrar mensagens de feedback
function showMessage(message, type = 'success') {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.alert-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert-${type} alert-message`;
    messageDiv.textContent = message;
    
    const configSection = document.querySelector('.alert-config');
    configSection.appendChild(messageDiv);
    
    // Remover mensagem após 5 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Função para filtrar eventos baseado na seleção dos checkboxes
function filterEventsByImpact(events) {
    const highImpactCheckbox = document.getElementById('highImpact');
    const mediumImpactCheckbox = document.getElementById('mediumImpact');
    const lowImpactCheckbox = document.getElementById('lowImpact');
    
    if (!highImpactCheckbox || !mediumImpactCheckbox || !lowImpactCheckbox) {
        return events; // Se não encontrar os checkboxes, retorna todos os eventos
    }
    
    const showHighImpact = highImpactCheckbox.checked;
    const showMediumImpact = mediumImpactCheckbox.checked;
    const showLowImpact = lowImpactCheckbox.checked;
    
    // Se nenhum estiver marcado, não mostra nenhum evento
    if (!showHighImpact && !showMediumImpact && !showLowImpact) {
        return [];
    }
    
    // Filtrar eventos baseado na seleção e priorizar eventos americanos importantes
    const filteredEvents = events.filter(event => {
        if (showHighImpact && event.impact === 'high') return true;
        if (showMediumImpact && event.impact === 'medium') return true;
        if (showLowImpact && event.impact === 'low') return true;
        return false;
    });
    
    // Ordenar apenas por data cronológica (mais próximo primeiro)
    return filteredEvents.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
    });
}

// Função para sincronizar banco com dados do widget
async function syncWithWidget() {
    const confirmation = confirm('🔄 SINCRONIZAR COM WIDGET REAL?\n\nIsto vai:\n1. ZERAR completamente o banco de dados local\n2. Capturar dados REAIS do widget Investing.com\n3. Preencher banco apenas com dados reais\n\nContinuar?');
    
    if (!confirmation) {
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = '🔄 Sincronizando...';
    
    try {
        const response = await fetch('/api/sync-with-widget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ SINCRONIZAÇÃO COMPLETA! ${data.eventsInserted} eventos reais inseridos no banco.`, 'success');
            
            // Recarregar dados automaticamente
            setTimeout(() => {
                loadEvents();
                window.location.reload(); // Recarregar página para ver mudanças
            }, 2000);
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha na sincronização'}`, 'error');
        }
    } catch (error) {
        console.error('Erro na sincronização:', error);
        showMessage('❌ Erro de conexão na sincronização.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Função para limpar todos os alertas
async function clearAllAlerts() {
    const confirmation = confirm('⚠️ Tem certeza que deseja remover TODOS os alertas configurados? Esta ação não pode ser desfeita.');
    
    if (!confirmation) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear-alerts', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ ${data.deletedCount || 0} alertas removidos com sucesso!`, 'success');
            loadAlerts(); // Recarregar lista de alertas
        } else {
            showMessage(`❌ Erro: ${data.error || 'Falha ao remover alertas'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao limpar alertas:', error);
        showMessage('❌ Erro de conexão ao limpar alertas.', 'error');
    }
}

// Função para recarregar dados da Tabela.sqlite
async function reloadSQLiteData() {
    const confirmation = confirm('🔄 Recarregar dados da Tabela.sqlite?\n\nIsto irá:\n1. Substituir todos os eventos atuais\n2. Carregar dados do arquivo Tabela.sqlite\n3. Manter os alertas configurados\n\nContinuar?');
    
    if (!confirmation) {
        return;
    }

    try {
        showMessage('🔄 Recarregando dados da Tabela.sqlite...', 'info');
        
        const response = await fetch('/api/reload-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
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
                loadEvents();
                window.location.reload();
            }, 2000);
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

// Função para carregar eventos na tabela estilo Investing.com
async function loadChronologicalEvents() {
    try {
        const response = await fetch('/api/all-events');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const tableBody = document.getElementById('economic-table-body');
        
        if (!data.success || data.events.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Nenhum evento encontrado na Tabela.sqlite</td></tr>';
            return;
        }

        // Filtrar eventos baseado nos checkboxes
        const filteredEvents = filterChronologicalEvents(data.events);
        
        if (filteredEvents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Nenhum evento encontrado para os filtros selecionados</td></tr>';
            return;
        }

        // Agrupar eventos por data para separadores
        const eventsByDate = {};
        filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const dateKey = eventDate.toISOString().split('T')[0];
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
        });

        let htmlContent = '';
        
        Object.entries(eventsByDate).forEach(([dateKey, events]) => {
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
            
            htmlContent += `
                <tr class="date-separator">
                    <td colspan="7">📅 ${dateString}</td>
                </tr>
            `;
            
            // Eventos do dia
            events.forEach(event => {
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
                let impactNumber = parseInt(event.impact) || 1;
                
                if (impactNumber >= 3) {
                    impactStars = '⭐⭐⭐';
                    impactClass = 'high';
                } else if (impactNumber >= 2) {
                    impactStars = '⭐⭐';
                    impactClass = 'medium';
                }
                
                // Comparar atual vs previsão para indicadores
                let actualClass = 'actual';
                if (event.actual_value && event.forecast_value) {
                    const actual = parseFloat(event.actual_value.replace(/[^\\d.-]/g, ''));
                    const forecast = parseFloat(event.forecast_value.replace(/[^\\d.-]/g, ''));
                    
                    if (!isNaN(actual) && !isNaN(forecast)) {
                        if (actual > forecast) actualClass += ' better';
                        else if (actual < forecast) actualClass += ' worse';
                        else actualClass += ' same';
                    }
                }
                
                htmlContent += `
                    <tr class="${impactClass}-impact">
                        <td class="time-cell">${brTime}</td>
                        <td class="currency-cell">USD</td>
                        <td class="impact-cell ${impactClass}">${impactStars}</td>
                        <td class="event-cell">${event.name}</td>
                        <td class="value-cell ${event.actual_value ? actualClass : 'empty'}">${event.actual_value || '—'}</td>
                        <td class="value-cell ${event.forecast_value ? 'forecast' : 'empty'}">${event.forecast_value || '—'}</td>
                        <td class="value-cell ${event.previous_value ? 'previous' : 'empty'}">${event.previous_value || '—'}</td>
                    </tr>
                `;
            });
        });
        
        tableBody.innerHTML = htmlContent;
        
    } catch (error) {
        console.error('Erro ao carregar tabela econômica:', error);
        document.getElementById('economic-table-body').innerHTML = 
            '<tr><td colspan="7" class="loading-cell">Erro ao carregar dados da Tabela.sqlite</td></tr>';
    }
}

// Função para filtrar eventos cronológicos baseado nos checkboxes
function filterChronologicalEvents(events) {
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

// Função chamada quando os filtros de impacto mudam
function filterEventsByImpact() {
    loadChronologicalEvents();
}