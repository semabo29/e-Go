/**
 * Prueba la conexión a la BD con la config de lib/db.js (.env).
 * Uso: node scripts/test-db-connection.js
 */
const { pool } = require('../lib/db');

async function test() {
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('Conexión OK. Hora del servidor:', result.rows[0].now);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
