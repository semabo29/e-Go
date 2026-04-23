const { pool } = require('../lib/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT id, external_id
      FROM ego.estaciones
      WHERE external_id LIKE 'row-%'
      ORDER BY id ASC
      LIMIT 20
    `);
    console.log(r.rows);
  } finally {
    await pool.end();
  }
})();

