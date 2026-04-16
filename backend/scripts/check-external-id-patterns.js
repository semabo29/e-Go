/**
 * Comprueba cómo se rellenó external_id en ego.estaciones.
 * - hay valores tipo "row-..." (vieja clave)
 * - hay valores solo numéricos (clave nueva)
 */
const { pool } = require('../lib/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE external_id LIKE 'row-%')::int AS row_like,
        count(*) FILTER (WHERE external_id ~ '^[0-9]+$')::int AS numeric_only,
        count(*) FILTER (WHERE external_id IS NULL)::int AS null_id
      FROM ego.estaciones
    `);
    console.log(r.rows[0]);
  } finally {
    await pool.end();
  }
})();

