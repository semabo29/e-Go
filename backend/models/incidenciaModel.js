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

async function hasOpenIncidenciaForConductorAndStation(conductor, estacio, tipus, client = null) {
  const db = client || pool;
  const isOperatiu = tipus === 'Operatiu';
  const result = await db.query(
    `SELECT 1 FROM ego.incidencia
     WHERE conductor = $1
       AND estacio = $2
       AND resolta = FALSE
       AND rebutjada = FALSE
       AND (
         ($3::boolean = TRUE AND tipus = 'Operatiu')
         OR ($3::boolean = FALSE AND tipus <> 'Operatiu')
       )
     LIMIT 1;`,
    [conductor, estacio, isOperatiu]
  );
  return result.rowCount > 0;
}

async function createIncidencia({ tipus, comentari, arxiu, conductor, estacio }, client = null) {
  const db = client || pool;
  const query = `
    INSERT INTO ego.incidencia (
      tipus,
      data_inici,
      comentari,
      arxiu,
      validada,
      resolta,
      rebutjada,
      punts_atorgats,
      conductor,
      estacio
    )
    VALUES ($1, NOW(), $2, $3, false, false, false, false, $4, $5)
    RETURNING *;
  `;
  const values = [tipus, comentari, arxiu || null, conductor, estacio];
  const result = await db.query(query, values);
  return result.rows[0];
}

// --- Consultas de gestión admin ---

async function listPending() {
  const query = `
    SELECT
      i.*,
      e.nom AS estacio_nom, e.municipi AS estacio_municipi, e.provincia AS estacio_provincia,
      u.username AS conductor_username, u.email AS conductor_email
    FROM ego.incidencia i
    JOIN ego.estaciones e ON e.id = i.estacio
    JOIN ego.usuari u ON u.id = i.conductor
    WHERE i.validada = FALSE AND i.rebutjada = FALSE AND i.resolta = FALSE
    ORDER BY i.data_inici ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

async function listHistory({ from, to, tipus, estado, limit = 20, offset = 0 }) {
  const conditions = [];
  const values = [];

  if (from) {
    values.push(from);
    conditions.push(`i.data_inici >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`i.data_inici <= $${values.length}`);
  }
  if (tipus) {
    values.push(tipus);
    conditions.push(`i.tipus = $${values.length}`);
  }
  if (estado) {
    if (estado === 'pending') {
      conditions.push(`(i.validada = FALSE AND i.rebutjada = FALSE AND i.resolta = FALSE)`);
    } else if (estado === 'validated') {
      conditions.push(`(i.validada = TRUE AND i.resolta = FALSE AND i.rebutjada = FALSE)`);
    } else if (estado === 'resolved') {
      conditions.push(`i.resolta = TRUE`);
    } else if (estado === 'rejected') {
      conditions.push(`i.rebutjada = TRUE`);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit);
  const limitPlaceholder = values.length;
  values.push(offset);
  const offsetPlaceholder = values.length;

  const query = `
    SELECT
      i.*,
      e.nom AS estacio_nom, e.municipi AS estacio_municipi, e.provincia AS estacio_provincia,
      u.username AS conductor_username, u.email AS conductor_email
    FROM ego.incidencia i
    JOIN ego.estaciones e ON e.id = i.estacio
    JOIN ego.usuari u ON u.id = i.conductor
    ${where}
    ORDER BY i.data_inici DESC
    LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder};
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

async function getById(id) {
  const query = `
    SELECT
      i.*,
      e.nom AS estacio_nom, e.municipi AS estacio_municipi, e.provincia AS estacio_provincia,
      u.username AS conductor_username, u.email AS conductor_email
    FROM ego.incidencia i
    JOIN ego.estaciones e ON e.id = i.estacio
    JOIN ego.usuari u ON u.id = i.conductor
    WHERE i.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Marca una incidencia como validada y activa el flag de puntos si no se habían otorgado antes.
 * Devuelve { incidencia, awardPoints } donde awardPoints indica si se deben sumar puntos ahora.
 */
async function validateIncidencia(client, id, adminId) {
  const result = await client.query(
    `UPDATE ego.incidencia
     SET validada = TRUE,
         data_validacio = NOW(),
         validada_by_admin = $2,
         punts_atorgats = TRUE
     WHERE id = $1
       AND validada = FALSE
       AND rebutjada = FALSE
     RETURNING *, (punts_atorgats = FALSE) AS was_unawarded;`,
    [id, adminId || null]
  );
  if (!result.rows[0]) return null;
  const incidencia = result.rows[0];
  return { incidencia, awardPoints: true };
}

async function rejectIncidencia(client, id, adminId, motiu) {
  const result = await client.query(
    `UPDATE ego.incidencia
     SET rebutjada = TRUE,
         data_rebuig = NOW(),
         rebutjada_by_admin = $2,
         motiu_rebuig = $3
     WHERE id = $1
       AND validada = FALSE
       AND rebutjada = FALSE
       AND resolta = FALSE
     RETURNING *;`,
    [id, adminId || null, motiu || null]
  );
  return result.rows[0] || null;
}

async function resolveIncidencia(client, id, adminId) {
  const result = await client.query(
    `UPDATE ego.incidencia
     SET resolta = TRUE,
         data_resolucio = NOW(),
         resolta_by_admin = $2
     WHERE id = $1
       AND validada = TRUE
       AND resolta = FALSE
       AND rebutjada = FALSE
     RETURNING *;`,
    [id, adminId || null]
  );
  return result.rows[0] || null;
}

async function countDistinctPendingReporters(client, estacioId, tipus) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT conductor) AS total
     FROM ego.incidencia
     WHERE estacio = $1
       AND tipus = $2
       AND validada = FALSE
       AND rebutjada = FALSE
       AND resolta = FALSE;`,
    [estacioId, tipus]
  );
  return Number.parseInt(result.rows[0].total, 10);
}

async function listPendingByStationAndType(client, estacioId, tipus) {
  const result = await client.query(
    `SELECT * FROM ego.incidencia
     WHERE estacio = $1
       AND tipus = $2
       AND validada = FALSE
       AND rebutjada = FALSE
       AND resolta = FALSE
     ORDER BY data_inici ASC;`,
    [estacioId, tipus]
  );
  return result.rows;
}

async function setStationOperatiu(client, estacioId, value) {
  await client.query(
    'UPDATE ego.estaciones SET operatiu = $2 WHERE id = $1;',
    [estacioId, value]
  );
}

module.exports = {
  getIncidenciaTypes,
  conductorExists,
  stationExists,
  hasOpenIncidenciaForConductorAndStation,
  createIncidencia,
  listPending,
  listHistory,
  getById,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
  countDistinctPendingReporters,
  listPendingByStationAndType,
  setStationOperatiu,
};
