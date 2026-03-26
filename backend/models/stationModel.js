const { pool } = require('../lib/db');

const upsertQuery = `
INSERT INTO ego.estaciones (
  external_id, promotor, acces, tipus_velocitat, tipus_connexio,
  latitud, longitud, nom, kw, ac_dc, adreca, municipi, provincia,
  is_manual
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false)
ON CONFLICT (external_id) DO UPDATE SET
  promotor = EXCLUDED.promotor,
  acces = EXCLUDED.acces,
  tipus_velocitat = EXCLUDED.tipus_velocitat,
  tipus_connexio = EXCLUDED.tipus_connexio,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  nom = EXCLUDED.nom,
  kw = EXCLUDED.kw,
  ac_dc = EXCLUDED.ac_dc,
  adreca = EXCLUDED.adreca,
  municipi = EXCLUDED.municipi,
  provincia = EXCLUDED.provincia,
  updated_at = NOW()
WHERE ego.estaciones.is_manual = false;
`;

// inserta estaciones nuevas y update de las que han cambiado
async function upsertStation(est) {
  await pool.query(upsertQuery, [
    est.id,
    est.promotor_gestor,
    est.acces,
    est.tipus_velocitat,
    est.tipus_connexi,
    parseFloat(est.latitud),
    parseFloat(est.longitud),
    est.designaci_descriptiva,
    parseFloat(est.kw) || 0,
    est.ac_dc,
    est.adre_a,
    est.municipi,
    est.provincia
  ]);
}

// Obtenemos la lógica avanzada de filtros de development
async function getAllStations(filters = {}) {
  const {minKw, maxKw, connectorType, ac_dc, north, south, east, west} = filters;

  // Base de la consulta.
  let query = 'SELECT * FROM ego.estaciones';
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Filtre per Viewport (Caja de coordenadas)
  if (north && south && east && west) {
    conditions.push(`latitud <= $${paramIndex}`);
    values.push(parseFloat(north));
    paramIndex++;

    conditions.push(`latitud >= $${paramIndex}`);
    values.push(parseFloat(south));
    paramIndex++;

    conditions.push(`longitud <= $${paramIndex}`);
    values.push(parseFloat(east));
    paramIndex++;

    conditions.push(`longitud >= $${paramIndex}`);
    values.push(parseFloat(west));
    paramIndex++;
  }

  // Filtre: Potència mínima
  if (minKw) {
    conditions.push(`kw >= $${paramIndex}`);
    values.push(parseFloat(minKw));
    paramIndex++;
  }

  // Filtre: Potència màxima
  if (maxKw) {
    conditions.push(`kw <= $${paramIndex}`);
    values.push(parseFloat(maxKw));
    paramIndex++;
  }

  // Filtre per Tipus de Connector
  if (connectorType) {
    conditions.push(`tipus_connexio ILIKE $${paramIndex}`);
    values.push(`%${connectorType}%`);
    paramIndex++;
  }

  // Filtre per Tipus de corrent (AC/DC)
  if (ac_dc) {
    conditions.push(`ac_dc ILIKE $${paramIndex}`);
    values.push(`%${ac_dc}%`);
    paramIndex++;
  }

  // Si hi ha alguna condició, afegim el WHERE a la consulta
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Afegim l'ordre al final
  query += ' ORDER BY id DESC';

  // Executem la consulta passant-li els valors dinàmics
  const result = await pool.query(query, values);
  return result.rows;
}

// Obtenemos el buscador de development
async function searchStations(q, filters = {}) {
  const { minKw, maxKw, connectorType, ac_dc } = filters;

  // Base de la consulta
  let query = 'SELECT DISTINCT * FROM ego.estaciones';
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // 1. Condició de cerca principal (Nom, Municipi o Adreça)
  if (q) {
    conditions.push(`(nom ILIKE $${paramIndex} OR municipi ILIKE $${paramIndex} OR adreca ILIKE $${paramIndex})`);
    values.push(`%${q}%`); // Afegim % perquè busqui coincidències parcials
    paramIndex++;
  }

  // 2. Filtre: Potència mínima
  if (minKw) {
    conditions.push(`kw >= $${paramIndex}`);
    values.push(parseFloat(minKw));
    paramIndex++;
  }

  // 3. Filtre: Potència màxima
  if (maxKw) {
    conditions.push(`kw <= $${paramIndex}`);
    values.push(parseFloat(maxKw));
    paramIndex++;
  }

  // 4. Filtre per Tipus de Connector
  if (connectorType) {
    conditions.push(`tipus_connexio ILIKE $${paramIndex}`);
    values.push(`%${connectorType}%`);
    paramIndex++;
  }

  // 5. Filtre per Tipus de corrent (AC/DC)
  if (ac_dc) {
    conditions.push(`ac_dc ILIKE $${paramIndex}`);
    values.push(`%${ac_dc}%`);
    paramIndex++;
  }

  // Ajuntem totes les condicions amb un AND
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Afegim un límit perquè el desplegable no es bloquegi carregant milers d'estacions
  query += ' ORDER BY id DESC';

  // Executem la consulta
  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = {
  upsertStation,
  getAllStations,
  createManualStation,
  updateManualStation,
  deleteManualStation,
  getManualStationsByAdmin,
  searchStations
};

async function createManualStation(data) {
  const query = `
    INSERT INTO ego.estaciones (
      external_id, promotor, acces, tipus_velocitat, tipus_connexio,
      latitud, longitud, nom, kw, ac_dc, adreca, municipi, provincia,
      is_manual, created_by_admin_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14)
    RETURNING *;
  `;
  const values = [
    data.external_id || null,
    data.promotor || null,
    data.acces || null,
    data.tipus_velocitat || null,
    data.tipus_connexio || null,
    data.latitud,
    data.longitud,
    data.nom,
    data.kw || 0,
    data.ac_dc || null,
    data.adreca || null,
    data.municipi || null,
    data.provincia || null,
    data.created_by_admin_id,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function updateManualStation(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }

  if (fields.length === 0) return null;

  const query = `
    UPDATE ego.estaciones
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx} AND is_manual = true
    RETURNING *;
  `;
  values.push(id);
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function deleteManualStation(id) {
  const result = await pool.query(
    'DELETE FROM ego.estaciones WHERE id = $1 AND is_manual = true RETURNING id',
    [id]
  );
  return result.rows[0];
}

async function getManualStationsByAdmin(adminUserId) {
  const result = await pool.query(
    `SELECT *
     FROM ego.estaciones
     WHERE is_manual = true AND created_by_admin_id = $1
     ORDER BY created_at DESC`,
    [adminUserId]
  );
  return result.rows;
}
