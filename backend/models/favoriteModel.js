const { pool } = require('../lib/db');

//Añadir una estacion de carga a favoritos de un usuario en la BD (tabla favorits)
async function addFavorite(usuariId, estacioId) {
 //Comentarios: 1) //Son placeholders (marcadores de posición), $1 recibirá el primer valor del array con el que
                    //se llama a la funcion pool.query (usuariId) y $2 el segundo (estacioId).
              //2)  RETURNING *;  Esto hace que retorne la fila insertada (un insert por defecto no lo hace)
  const query = `
    INSERT INTO ego.favorits (usuari_id, estacio_id)
    VALUES ($1, $2)
    ON CONFLICT (usuari_id, estacio_id) DO NOTHING
    RETURNING *;
  `;
  const result = await pool.query(query, [usuariId, estacioId]);
  return result.rows[0];//Solo devolvemos una fila
}

//Eliminar una estacion de carga a favoritos de un usuario en la BD (tabla favorits)
async function removeFavorite(usuariId, estacioId) {
  const query = `
    DELETE FROM ego.favorits
    WHERE usuari_id = $1 AND estacio_id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [usuariId, estacioId]);
  return result.rows[0];//Solo devolvemos una fila
}

async function getFavoritesByUser(usuariId) {
  // Esta consulta une favoritos con estaciones para devolver la info completa
  const query = `
    SELECT e.*
    FROM ego.estaciones e INNER JOIN ego.favorits f ON e.id = f.estacio_id
    WHERE f.usuari_id = $1
    ORDER BY f.created_at DESC;
  `;
  const result = await pool.query(query, [usuariId]);
  return result.rows;
}

//Funciones que queremos que se puedan llamar desde el exterior
module.exports = {
  addFavorite,
  removeFavorite,
  getFavoritesByUser
};