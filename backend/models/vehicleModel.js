const { pool } = require('../lib/db');

//Afegir un vehicle d'un usuari a la base de dades (taula vehicles)
async function addCar(usuariId, nom, potencia, conector, corrent) {
  const query = `
    INSERT INTO ego.vehicles (usuari_id, nom, kw, ac_dc, tipus_connexio)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (usuari_id, nom) DO NOTHING
    RETURNING *;
  `;
  const result = await pool.query(query, [usuariId, nom, potencia, corrent, conector]);
  return result.rows[0]; //Només torna una fila
}

//Eliminar un vehicle d'un usuari de la base de dades (taula vehicles)
async function removeVehicle(usuariId, nom) {
  const query = `
    DELETE FROM ego.vehicles
    WHERE usuari_id = $1 AND nom = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [usuariId, nom]);
  return result.rows[0];//Només torna una fila
}

// Torna els vehicles d'un usuari de la base de dades (taula vehicles)
async function getVehiclesByUser(usuariId) {
  const query = `
    SELECT *
    FROM ego.vehicles
    WHERE usuari_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [usuariId]);
  return result.rows;
}

module.exports = {
  addCar,
  removeVehicle,
  getVehiclesByUser
};