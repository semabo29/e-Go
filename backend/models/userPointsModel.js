const { pool } = require('../lib/db');

// Obtener puntos de un usuario
async function getUserPoints(usuariId) {
  const result = await pool.query(
    'SELECT user_id as id, punts as points FROM ego.conductor WHERE user_id = $1',
    [usuariId]
  );

  // Si l'usuari encara no té perfil de conductor, no llançem error,
  // simplement assumim que té 0 punts.
  if (result.rows.length === 0) {
    return {
      usuari_id: usuariId,
      puntos_totales: 0
    };
  }

  return {
    usuari_id: result.rows[0].id,
    puntos_totales: result.rows[0].points
  };
}

// Establecer puntos absolutos de un usuario (UPSERT)
async function setPoints(usuariId, puntosTotales) {
  const query = `
    INSERT INTO ego.conductor (user_id, punts)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE
    SET punts = EXCLUDED.punts
    RETURNING user_id as id, punts as points;
  `;
  const result = await pool.query(query, [usuariId, puntosTotales]);
  if (result.rows.length === 0) {
    throw new Error('No se pudo actualizar los puntos del conductor');
  }
  return result.rows[0];
}

// Añadir puntos a un usuario (UPSERT)
async function addPoints(usuariId, puntosGanados) {
  // Utilitzem ON CONFLICT per crear la fila si no existeix
  const query = `
    INSERT INTO ego.conductor (user_id, punts)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE
    SET punts = ego.conductor.punts + EXCLUDED.punts
    RETURNING user_id as id, punts as points;
  `;

  const result = await pool.query(query, [usuariId, puntosGanados]);

  if (result.rows.length === 0) {
    throw new Error('No se pudo actualizar los puntos del conductor');
  }

  return result.rows[0];
}

// Obtener ranking de usuarios por puntos
async function getLeaderboard(limit = 10, offset = 0) {
  // Fem un JOIN entre usuari i conductor per tenir el username i els punts[cite: 15]
  const query = `
    SELECT
      u.id as usuari_id,
      u.username,
      c.punts as puntos_totales
    FROM ego.conductor c
    JOIN ego.usuari u ON c.user_id = u.id
    WHERE c.punts > 0
    ORDER BY c.punts DESC
    LIMIT $1 OFFSET $2;
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

// Obtener posición de un usuario en el ranking
async function getUserRanking(usuariId) {
  // Comptem la posició utilitzant la taula conductor[cite: 15]
  const query = `
    SELECT
      COUNT(*) + 1 as posicion
    FROM ego.conductor
    WHERE punts > (SELECT punts FROM ego.conductor WHERE user_id = $1);
  `;
  const result = await pool.query(query, [usuariId]);
  return result.rows[0]?.posicion || 0;
}

module.exports = {
  getUserPoints,
  setPoints,
  addPoints,
  getLeaderboard,
  getUserRanking
};