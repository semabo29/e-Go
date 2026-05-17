// Acceso a BD para usuarios: buscar por email y crear usuario
const { pool, USUARIOS_TABLE, AMIGOS_TABLE } = require('../lib/db');

async function getFriends(userId) {
  const result = await pool.query(
    `SELECT
       CASE
         WHEN a.usuari_id1 = $1 THEN a.usuari_id2
         ELSE a.usuari_id1
       END AS id, a.per_acceptar, u.username
     FROM ego.amics a
     JOIN ego.usuari u ON (u.id = CASE
         WHEN a.usuari_id1 = $1 THEN a.usuari_id2
         ELSE a.usuari_id1
       END)
     WHERE a.usuari_id1 = $1 OR a.usuari_id2 = $1;`,
    [userId]
  );
  return result.rows;
}

async function addFriend(userId1, userId2) {
  const result = await pool.query(
    `INSERT INTO ${AMIGOS_TABLE} (usuari_id1, usuari_id2, per_acceptar)
     VALUES ( $1, $2, $3 )
     RETURNING usuari_id1, usuari_id2;`,
    (userId1 < userId2) ? [userId1, userId2, userId2] : [userId2, userId1, userId2]
  );
  return result.rows[0];
}
  
async function removeFriend(userId1, userId2) {
  const result = await pool.query(
    `DELETE FROM ${AMIGOS_TABLE}
     WHERE usuari_id1 = $1 AND usuari_id2 = $2
     RETURNING usuari_id1, usuari_id2;`,
    (userId1 < userId2) ? [userId1, userId2] : [userId2, userId1]
  );
  return result.rows[0];
}

async function acceptFriend(userId1, userId2) {
  const result = await pool.query(
    `UPDATE ${AMIGOS_TABLE}
     SET per_acceptar = NULL
     WHERE usuari_id1 = $1 AND usuari_id2 = $2
     RETURNING usuari_id1, usuari_id2, per_acceptar;`,
    (userId1 < userId2) ? [userId1, userId2] : [userId2, userId1]
  );
  return result.rows[0];
}

module.exports = {
  getFriends,
  addFriend,
  removeFriend,
  acceptFriend
};
