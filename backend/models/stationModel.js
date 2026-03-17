const { pool } = require('../lib/db');

const upsertQuery = `
INSERT INTO ego.estaciones (
  external_id, promotor, acces, tipus_velocitat, tipus_connexio,
  latitud, longitud, nom, kw, ac_dc, adreca, municipi, provincia
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
  updated_at = NOW();
`;

// inserta estaciones nuevas y update de las que han cambiado
async function upsertStation(est) {
  await pool.query(upsertQuery, [
    est[':id'] || est.id,
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

async function getAllStations(filters = {}) {
  const {minKw, maxKw, connectorType, ac_dc} = filters;

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
    // Utilitzem ILIKE per fer una cerca flexible (ignora majúscules/minúscules)
    // i % als extrems perquè ho trobi encara que el text sigui "Schuko i MENNEKES"
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

module.exports = {
  upsertStation,
  getAllStations
};