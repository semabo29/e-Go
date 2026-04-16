const { pool } = require('../lib/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT
        count(*)::int AS total_10m,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like_10m
      FROM ego.estaciones
      WHERE created_at >= NOW() - interval '10 minutes'
    `);
    console.log(r.rows[0]);
  } finally {
    await pool.end();
  }
})();

