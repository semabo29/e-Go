const { pool, CONDUCTORES_TABLE } = require('../lib/db');

async function getIncidenciaTypes() {
  const query = `
    SELECT e.enumlabel AS value
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'ego' AND t.typname = 'tipus_incidencia'
    ORDER BY e.enumsortorder;
  `;
  const result = await pool.query(query);
  return result.rows.map((row) => row.value);
}

async function conductorExists(userId) {
  const result = await pool.query(
    `SELECT 1 FROM ${CONDUCTORES_TABLE} WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

async function stationExists(stationId) {
  const result = await pool.query(
    'SELECT 1 FROM ego.estaciones WHERE id = $1 LIMIT 1',
    [stationId]
  );
  return result.rowCount > 0;
}

async function createIncidencia({ tipus, comentari, arxiu, conductor, estacio }) {
  const query = `
    INSERT INTO ego.incidencia (
      tipus,
      dataInici,
      comentari,
      arxiu,
      validada,
      resolta,
      conductor,
      estacio
    )
    VALUES ($1, NOW(), $2, $3, false, false, $4, $5)
    RETURNING *;
  `;
  const values = [tipus, comentari, arxiu || null, conductor, estacio];
  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  getIncidenciaTypes,
  conductorExists,
  stationExists,
  createIncidencia,
};
