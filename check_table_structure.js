import sqlite3 from 'sqlite3';

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura da Tabela.sqlite...');
  
  const fs = await import('fs');
  if (!fs.existsSync('./Tabela.sqlite')) {
    console.log('❌ Arquivo Tabela.sqlite não encontrado');
    return;
  }

  const db = new sqlite3.Database('./Tabela.sqlite');
  
  // Função para promisificar queries
  const allAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, function(err, rows) {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    // Listar todas as tabelas
    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tabelas encontradas:', tables.map(t => t.name));

    // Para cada tabela, mostrar estrutura
    for (const table of tables) {
      console.log(`\n📊 Estrutura da tabela "${table.name}":`);
      const info = await allAsync(`PRAGMA table_info(${table.name})`);
      console.table(info);

      // Mostrar alguns dados de exemplo
      const sample = await allAsync(`SELECT * FROM ${table.name} LIMIT 3`);
      console.log(`\n📝 Dados de exemplo da tabela "${table.name}":`);
      console.table(sample);
    }

    db.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    db.close();
  }
}

checkTableStructure().catch(console.error);