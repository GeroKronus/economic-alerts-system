import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/alerts.db');

// Promisify para usar async/await
db.runAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);

// Criar tabelas
export async function initDB() {
  // Tabela de eventos econômicos
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date DATETIME NOT NULL,
      impact TEXT,
      previous_value TEXT,
      forecast_value TEXT,
      actual_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de alertas configurados
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      hours_before INTEGER NOT NULL,
      message_template TEXT,
      is_active BOOLEAN DEFAULT 1,
      chat_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Verificar e adicionar colunas necessárias
  try {
    await db.runAsync(`ALTER TABLE alerts ADD COLUMN impact_level TEXT`);
    console.log('✅ Coluna impact_level adicionada à tabela alerts');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ Coluna impact_level já existe');
    } else {
      console.log('⚠️ Erro ao adicionar coluna impact_level:', error.message);
    }
  }
  
  try {
    await db.runAsync(`ALTER TABLE alerts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    console.log('✅ Coluna updated_at adicionada à tabela alerts');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ Coluna updated_at já existe');
    } else {
      console.log('⚠️ Erro ao adicionar coluna updated_at:', error.message);
    }
  }

  // Tabela de mensagens enviadas
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS sent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      alert_id INTEGER,
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT,
      chat_id TEXT
    )
  `);

  console.log('✅ Banco de dados inicializado');
}

// Funções auxiliares
export async function saveEvent(event) {
  const { name, date, impact, previous_value, forecast_value } = event;
  
  // Verificar se já existe
  const existing = await db.getAsync(
    'SELECT id FROM events WHERE name = ? AND date = ?',
    [name, date]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE events SET impact = ?, previous_value = ?, forecast_value = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [impact, previous_value, forecast_value, existing.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO events (name, date, impact, previous_value, forecast_value) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, date, impact, previous_value, forecast_value]
    );
  }
}

export async function getUpcomingEvents() {
  // Retornar TODOS os eventos futuros, sem limitações
  // Se existe alerta configurado, deve ser processado
  const now = new Date().toISOString();
  
  return db.allAsync(`
    SELECT * FROM events 
    WHERE date > ? 
    ORDER BY date ASC
  `, [now]);
}

export async function getAllEvents() {
  return db.allAsync(`
    SELECT *, 
           datetime(date) as formatted_date,
           datetime('now') as current_time,
           date(date) as brasil_date,
           time(date) as brasil_hour,
           CASE WHEN date > datetime('now') THEN 'future' ELSE 'past' END as status
    FROM events 
    ORDER BY date ASC
  `);
}

export async function getActiveAlerts() {
  return db.allAsync('SELECT * FROM alerts WHERE is_active = 1');
}

export async function saveAlert(alert) {
  const { event_type, impact_level, hours_before, message_template, chat_id } = alert;
  return db.runAsync(
    `INSERT INTO alerts (event_type, impact_level, hours_before, message_template, chat_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [event_type, impact_level, hours_before, message_template, chat_id]
  );
}

// Nova função para salvar alertas por categoria de impacto
export async function saveImpactAlert(alertConfig) {
  const { impact_level, hours_before, chat_id } = alertConfig;
  
  // Verificar se já existe um alerta EXATO (mesma categoria + mesmo tempo + mesmo chat)
  const existing = await db.getAsync(
    'SELECT id FROM alerts WHERE impact_level = ? AND hours_before = ? AND chat_id = ?',
    [impact_level, hours_before, chat_id]
  );

  if (existing) {
    // Já existe um alerta idêntico, não fazer nada
    console.log(`⚠️ Alerta já existe: ${impact_level} ${hours_before}h para chat ${chat_id}`);
    return existing.id;
  } else {
    // Criar novo alerta (permite múltiplos tempos para a mesma categoria)
    try {
      const result = await db.runAsync(
        `INSERT INTO alerts (event_type, impact_level, hours_before, chat_id) 
         VALUES (?, ?, ?, ?)`,
        [`CATEGORY_${impact_level.toUpperCase()}`, impact_level, hours_before, chat_id]
      );
      console.log(`✅ Novo alerta criado: ${impact_level} ${hours_before}h para chat ${chat_id}`);
      return result.lastID || 0;
    } catch (error) {
      console.error('Erro ao inserir alerta:', error);
      throw error;
    }
  }
}

// Função para buscar alertas ativos por categoria de impacto
export async function getImpactAlerts() {
  return db.allAsync(`
    SELECT * FROM alerts 
    WHERE impact_level IS NOT NULL 
    AND is_active = 1
    ORDER BY impact_level, hours_before
  `);
}

export async function saveSentMessage(data) {
  const { event_id, alert_id, message, status, chat_id } = data;
  return db.runAsync(
    `INSERT INTO sent_messages (event_id, alert_id, message, status, chat_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [event_id, alert_id, message, status, chat_id]
  );
}

export async function getRecentLogs(limit = 50) {
  return db.allAsync(`
    SELECT * FROM sent_messages 
    ORDER BY sent_at DESC 
    LIMIT ?
  `, [limit]);
}

export async function wasRecentlySent(eventId, alertId) {
  // Verificar se foi enviado nas últimas 4 horas
  const recent = await db.getAsync(`
    SELECT id FROM sent_messages 
    WHERE event_id = ? AND alert_id = ? 
    AND sent_at > datetime('now', '-4 hours')
  `, [eventId, alertId]);
  
  return !!recent;
}

export async function getEventsToday() {
  return db.allAsync(`
    SELECT * FROM events 
    WHERE date(date) = date('now') 
    ORDER BY date ASC
  `);
}

export async function clearAllAlerts() {
  try {
    const result = await db.runAsync('DELETE FROM alerts');
    return result.changes || 0;
  } catch (error) {
    console.error('Erro ao limpar alertas:', error);
    return 0;
  }
}