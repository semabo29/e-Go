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

async function getAllStations() {
  const result = await pool.query(
    'SELECT * FROM ego.estaciones ORDER BY id DESC'
  );
  return result.rows;
}

module.exports = {
  upsertStation,
  getAllStations
};