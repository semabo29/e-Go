const { pool } = require('../lib/db');
const stationService = require('../services/stationService');

async function countNonNumeric() {
  const r = await pool.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
      count(*) FILTER (WHERE external_id !~ '^[0-9]+$')::int AS non_numeric
    FROM ego.estaciones
  `);
  return r.rows[0];
}

(async () => {
  try {
    console.log('Inicial:', await countNonNumeric());
    console.log('--- Sync 1 ---');
    await stationService.syncStations();
    console.log('Tras sync 1:', await countNonNumeric());

    console.log('--- Sync 2 ---');
    await stationService.syncStations();
    console.log('Tras sync 2:', await countNonNumeric());
  } finally {
    await pool.end();
  }
})();

