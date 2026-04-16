const { pool } = require('../lib/db');

(async () => {
  try {
    const before = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
        count(*) FILTER (WHERE external_id !~ '^[0-9]+$')::int AS non_numeric
      FROM ego.estaciones
    `);
    console.log('before:', before.rows[0]);

    await pool.query(`DELETE FROM ego.estaciones WHERE external_id LIKE 'row-%'`);

    const after = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
        count(*) FILTER (WHERE external_id !~ '^[0-9]+$')::int AS non_numeric
      FROM ego.estaciones
    `);
    console.log('after:', after.rows[0]);
  } finally {
    await pool.end();
  }
})();

