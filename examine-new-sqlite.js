import sqlite3 from 'sqlite3';

console.log('📋 EXAMINANDO NOVO BANCO: calendario_US_corrected_from_uploaded_v2.sqlite');

const externalDb = new sqlite3.Database('./calendario_US_corrected_from_uploaded_v2.sqlite');

// Promisify para usar async/await
externalDb.allAsync = function(sql, params) {
  return new Promise((resolve, reject) => {
    externalDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function examineNewDatabase() {
  try {
    console.log('🔍 Verificando tabelas...');
    
    // Listar todas as tabelas
    const tables = await externalDb.allAsync(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
    `);
    
    console.log(`📊 Tabelas encontradas: ${tables.length}`);
    for (const table of tables) {
      console.log(`  - ${table.name}`);
    }
    console.log('');
    
    // Para cada tabela, mostrar estrutura e alguns dados
    for (const table of tables) {
      try {
        console.log(`📋 TABELA: ${table.name}`);
        
        // Schema da tabela
        const schema = await externalDb.allAsync(`PRAGMA table_info(${table.name});`);
        console.log('🔧 Estrutura:');
        for (const column of schema) {
          console.log(`  - ${column.name}: ${column.type} ${column.pk ? '(PK)' : ''}`);
        }
        
        // Contar registros
        const count = await externalDb.allAsync(`SELECT COUNT(*) as total FROM ${table.name};`);
        console.log(`📊 Total de registros: ${count[0].total}`);
        
        // Mostrar alguns exemplos
        if (count[0].total > 0) {
          const samples = await externalDb.allAsync(`SELECT * FROM ${table.name} LIMIT 3;`);
          console.log('📋 Exemplos de dados:');
          for (const sample of samples) {
            console.log('  ', JSON.stringify(sample, null, 2));
          }
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erro ao examinar tabela ${table.name}:`, error.message);
      }
    }
    
    console.log('🎯 PRONTO PARA IMPORTAÇÃO!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    externalDb.close();
  }
}

examineNewDatabase();