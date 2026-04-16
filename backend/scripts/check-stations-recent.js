/**
 * Diagnóstico: en los últimos minutos, cuántas filas son nuevas vs actualizadas.
 * Uso: node scripts/check-stations-recent.js
 */
const { pool } = require('../lib/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE created_at >= NOW() - interval '6 minutes')::int AS created_recent,
        count(*) FILTER (WHERE updated_at >= NOW() - interval '6 minutes')::int AS updated_recent
      FROM ego.estaciones
    `);
    console.log('recent stats:', r.rows[0]);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

