/**
 * Trunca ego.estaciones y ejecuta 1 sync con el código actual,
 * luego imprime:
 * - total filas
 * - cuántas tienen external_id "row-" vs numéricas
 *
 * Uso: node scripts/truncate-and-sync-stations.js
 */
const { pool } = require('../lib/db');
const stationService = require('../services/stationService');

(async () => {
  try {
    await pool.query('TRUNCATE TABLE ego.estaciones RESTART IDENTITY');
    await stationService.syncStations();

    const stats = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
        count(*) FILTER (WHERE external_id ~ '^[0-9]+$')::int AS numeric_only,
        count(*) FILTER (WHERE external_id IS NULL)::int AS null_id
      FROM ego.estaciones
    `);

    console.log('after sync stats:', stats.rows[0]);
  } finally {
    await pool.end();
  }
})();

