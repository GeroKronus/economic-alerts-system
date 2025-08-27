import sqlite3 from 'sqlite3';
import moment from 'moment-timezone';
import fs from 'fs';

// Sistema de importação automática de dados da Tabela.sqlite
export class SQLiteDataSource {
  constructor() {
    this.externalDbPath = './Tabela.sqlite';
    this.appDb = new sqlite3.Database('./data/alerts.db');
    
    // Promisify para usar async/await
    this.appDb.runAsync = function(sql, params) {
      return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }.bind(this.appDb);

    this.appDb.allAsync = function(sql, params) {
      return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }.bind(this.appDb);
  }

  // Função para converter impacto numérico para texto
  convertImpact(numericImpact) {
    switch(parseInt(numericImpact)) {
      case 1: return 'low';
      case 2: return 'medium';
      case 3: return 'high';
      default: return 'medium';
    }
  }

  // Importar dados exatamente como estão na Tabela.sqlite (sem nenhuma conversão)
  convertToBrasilia(date, time) {
    try {
      // Retornar data/hora exatamente como está na tabela
      return `${date}T${time}:00`;
    } catch (error) {
      console.log(`⚠️ Erro ao processar data/hora: ${date} ${time}`);
      return new Date().toISOString();
    }
  }

  // Função principal para importar dados da Tabela.sqlite
  async importDataFromSQLite() {
    return new Promise((resolve, reject) => {
      console.log('📊 Importando dados da Tabela.sqlite...');
      
      // Conectar ao banco externo
      const externalDb = new sqlite3.Database(this.externalDbPath, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar com Tabela.sqlite:', err.message);
          reject(new Error('Arquivo Tabela.sqlite não encontrado'));
          return;
        }
      });

      // Promisify para o banco externo
      externalDb.allAsync = function(sql, params) {
        return new Promise((resolve, reject) => {
          externalDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      };

      const importProcess = async () => {
        try {
          // Limpar dados antigos
          await this.appDb.runAsync('DELETE FROM events');
          
          // Ler dados da tabela externa
          const externalEvents = await externalDb.allAsync(`
            SELECT * FROM economic_calendar 
            WHERE currency = 'USD'
            ORDER BY date ASC, time ASC
          `);
          
          console.log(`📋 Encontrados ${externalEvents.length} eventos na Tabela.sqlite`);
          
          let insertedCount = 0;
          let highImpactCount = 0;
          let mediumImpactCount = 0;
          let lowImpactCount = 0;
          
          for (const externalEvent of externalEvents) {
            try {
              const impact = this.convertImpact(externalEvent.impact);
              const brasiliaDateTime = this.convertToBrasilia(externalEvent.date, externalEvent.time);
              
              console.log(`📅 ${externalEvent.event}: ${externalEvent.date} ${externalEvent.time} -> ${brasiliaDateTime}`);
              
              await this.appDb.runAsync(`
                INSERT INTO events (name, date, impact, forecast_value, previous_value, actual_value, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `, [
                externalEvent.event,
                brasiliaDateTime,
                impact,
                externalEvent.forecast || '',
                externalEvent.previous || '',
                externalEvent.actual || null
              ]);
              
              insertedCount++;
              
              if (impact === 'high') highImpactCount++;
              else if (impact === 'medium') mediumImpactCount++;
              else lowImpactCount++;
              
            } catch (error) {
              console.log(`❌ Erro ao importar ${externalEvent.event}: ${error.message}`);
            }
          }
          
          console.log('📊 RESUMO DA IMPORTAÇÃO:');
          console.log(`✅ ${insertedCount} eventos importados da Tabela.sqlite`);
          console.log(`🔴 ${highImpactCount} eventos de ALTO impacto`);
          console.log(`🟡 ${mediumImpactCount} eventos de MÉDIO impacto`);
          console.log(`⚪ ${lowImpactCount} eventos de BAIXO impacto`);
          
          externalDb.close();
          resolve({
            success: true,
            eventsImported: insertedCount,
            highImpact: highImpactCount,
            mediumImpact: mediumImpactCount,
            lowImpact: lowImpactCount
          });
          
        } catch (error) {
          externalDb.close();
          reject(error);
        }
      };

      importProcess();
    });
  }

  // Verificar se Tabela.sqlite existe
  checkSQLiteFile() {
    return fs.existsSync(this.externalDbPath);
  }

  // Função para ser chamada automaticamente na inicialização
  async initialize() {
    try {
      if (!this.checkSQLiteFile()) {
        console.log('⚠️ Arquivo Tabela.sqlite não encontrado');
        return { success: false, error: 'Tabela.sqlite não encontrada' };
      }

      const result = await this.importDataFromSQLite();
      console.log('✅ Dados importados da Tabela.sqlite com sucesso');
      return result;
      
    } catch (error) {
      console.error('❌ Erro na inicialização da fonte SQLite:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default SQLiteDataSource;