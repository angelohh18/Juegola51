// Test script para verificar la conexión a la base de datos
const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDatabaseConnection() {
  try {
    console.log('🔄 Probando conexión a la base de datos...');
    
    // Test 1: Conexión básica
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a la base de datos:', result.rows[0]);
    
    // Test 2: Verificar tablas existentes
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tablas existentes:', tablesResult.rows.map(row => row.table_name));
    
    // Test 3: Verificar tabla users
    try {
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      console.log('👥 Total de usuarios en la base de datos:', usersResult.rows[0].count);
    } catch (error) {
      console.log('⚠️ Tabla users no existe aún (se creará en el primer deployment)');
    }
    
    console.log('🎉 Test de base de datos completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la conexión a la base de datos:', error.message);
    console.error('Detalles:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar el test
testDatabaseConnection();
