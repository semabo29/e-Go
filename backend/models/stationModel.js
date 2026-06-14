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
  const { minKw, maxKw, connectorType, ac_dc } = filters;

  // Base de la consulta.
  let query = 'SELECT * FROM ego.estaciones';
  const conditions = [];
  const values = [];
  let paramIndex = 1;

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
  getAllStationsForAdmin,
  setStationOperatiu,
  createManualStation,
  updateManualStation,
  deleteManualStation,
  getManualStationsByAdmin,
  getManualStationsByCompany,
  getCompanyOwnedManualStationById,
  updateCompanyOwnedManualStation,
  deleteCompanyOwnedManualStation,
  searchStations
};

async function getAllStationsForAdmin({ q = '', limit = 51, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (q) {
    conditions.push(
      `(nom ILIKE $${idx} OR municipi ILIKE $${idx} OR provincia ILIKE $${idx})`
    );
    values.push(`%${q}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT id, nom, municipi, provincia, adreca, kw, ac_dc, tipus_connexio, is_manual, operatiu
     FROM ego.estaciones
     ${where}
     ORDER BY nom ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );
  return result.rows;
}

async function setStationOperatiu(id, operatiu) {
  const result = await pool.query(
    `UPDATE ego.estaciones
     SET operatiu = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nom, municipi, provincia, adreca, kw, ac_dc, tipus_connexio, is_manual, operatiu`,
    [id, operatiu]
  );
  return result.rows[0] || null;
}

async function createManualStation(data, dbClient = pool) {
  const query = `
    INSERT INTO ego.estaciones (
      external_id, promotor, acces, tipus_velocitat, tipus_connexio,
      latitud, longitud, nom, kw, ac_dc, adreca, municipi, provincia,
      is_manual, created_by_admin_id, owner_company_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$15)
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
    data.created_by_admin_id || null,
    data.owner_company_id || null,
  ];
  const result = await dbClient.query(query, values);
  return result.rows[0];
}

async function updateManualStation(id, patch, dbClient = pool) {
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
  const result = await dbClient.query(query, values);
  return result.rows[0];
}

async function deleteManualStation(id, dbClient = pool) {
  const result = await dbClient.query(
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

async function getManualStationsByCompany(companyId) {
  const result = await pool.query(
    `SELECT *
     FROM ego.estaciones
     WHERE is_manual = true AND owner_company_id = $1
     ORDER BY created_at DESC`,
    [companyId]
  );
  return result.rows;
}

async function getCompanyOwnedManualStationById(id, companyId) {
  const result = await pool.query(
    `SELECT *
     FROM ego.estaciones
     WHERE id = $1 AND is_manual = true AND owner_company_id = $2`,
    [id, companyId]
  );
  return result.rows[0] || null;
}

async function updateCompanyOwnedManualStation(id, companyId, patch, dbClient = pool) {
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
    WHERE id = $${idx} AND is_manual = true AND owner_company_id = $${idx + 1}
    RETURNING *;
  `;
  values.push(id, companyId);
  const result = await dbClient.query(query, values);
  return result.rows[0] || null;
}

async function deleteCompanyOwnedManualStation(id, companyId, dbClient = pool) {
  const result = await dbClient.query(
    `DELETE FROM ego.estaciones
     WHERE id = $1 AND is_manual = true AND owner_company_id = $2
     RETURNING id`,
    [id, companyId]
  );
  return result.rows[0] || null;
}
