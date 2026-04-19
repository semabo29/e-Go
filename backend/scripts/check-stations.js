/**
 * Diagnóstico de estaciones en RDS:
 * - total de filas
 * - cuántas tienen external_id NULL
 * - si existen duplicados para external_id (debería no haber si hay UNIQUE)
 * - qué constraint UNIQUE existe
 */
const { pool } = require('../lib/db');

(async () => {
  try {
    const stats = await pool.query(
      'SELECT count(*)::int AS total, count(*) FILTER (WHERE external_id IS NULL)::int AS null_external_id FROM ego.estaciones'
    );
    console.log('stats:', stats.rows[0]);

    const dup = await pool.query(
      'SELECT external_id, count(*)::int AS c FROM ego.estaciones WHERE external_id IS NOT NULL GROUP BY external_id HAVING count(*)>1 ORDER BY c DESC LIMIT 5'
    );
    console.log('top dup external_id:', dup.rows);

    // constraints UNIQUE en la tabla
    const uniqueCons = await pool.query(
      "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = '\"ego\".\"estaciones\"'::regclass AND contype='u'"
    );
    console.log('unique constraints:', uniqueCons.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

