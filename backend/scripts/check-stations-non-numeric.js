const { pool } = require('../lib/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
        count(*) FILTER (WHERE external_id !~ '^[0-9]+$')::int AS non_numeric
      FROM ego.estaciones
    `);
    console.log(r.rows[0]);
  } finally {
    await pool.end();
  }
})();

