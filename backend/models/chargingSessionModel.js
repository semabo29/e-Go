const { pool } = require('../lib/db');

// Iniciar una sesión de carga
async function startSession(usuariId, estacioId, ubicacionLat, ubicacionLon) {
  const query = `
    INSERT INTO ego.charging_sessions 
    (usuari_id, estacio_id, status)
    VALUES ($1, $2, 'active')
    RETURNING *;
  `;
  const result = await pool.query(query, [usuariId, estacioId]);
  return result.rows[0];
}

// Finalizar una sesión de carga
async function endSession(sessionId, duracionMinutos, puntosFinales, razonFinalizacion, multiplicador = 1.0) {
  const query = `
    UPDATE ego.charging_sessions
    SET 
      fin = NOW(),
      duracion_minutos = $2,
      puntos_totales = $3,
      razon_finalizacion = $4,
      multiplicador_premium = $5,
      status = 'completed'
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [sessionId, duracionMinutos, puntosFinales, razonFinalizacion, multiplicador]);
  return result.rows[0];
}

// Cancelar una sesión de carga
async function cancelSession(sessionId, razonCancelacion = 'manual') {
  const query = `
    UPDATE ego.charging_sessions
    SET 
      fin = NOW(),
      razon_finalizacion = $2,
      status = 'cancelled'
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [sessionId, razonCancelacion]);
  return result.rows[0];
}

// Obtener una sesión por ID
async function getSessionById(sessionId) {
  const query = `
    SELECT * FROM ego.charging_sessions
    WHERE id = $1;
  `;
  const result = await pool.query(query, [sessionId]);
  return result.rows[0] || null;
}

// Obtener sesión activa del usuario
async function getUserActiveSession(usuariId) {
  const query = `
    SELECT * FROM ego.charging_sessions
    WHERE usuari_id = $1 AND status = 'active'
    ORDER BY inicio DESC
    LIMIT 1;
  `;
  const result = await pool.query(query, [usuariId]);
  return result.rows[0] || null;
}

// Obtener todas las sesiones de un usuario
async function getUserSessions(usuariId, limit = 10, offset = 0) {
  const query = `
    SELECT * FROM ego.charging_sessions
    WHERE usuari_id = $1
    ORDER BY inicio DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await pool.query(query, [usuariId, limit, offset]);
  return result.rows;
}

// Obtener estadísticas de sesiones de un usuario
async function getUserSessionStats(usuariId) {
  const query = `
    SELECT 
      COUNT(*) as total_sesiones,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as sesiones_completadas,
      COALESCE(SUM(duracion_minutos), 0) as minutos_totales,
      COALESCE(SUM(puntos_totales), 0) as puntos_totales
    FROM ego.charging_sessions
    WHERE usuari_id = $1 AND status = 'completed';
  `;
  const result = await pool.query(query, [usuariId]);
  return result.rows[0];
}

module.exports = {
  startSession,
  endSession,
  cancelSession,
  getSessionById,
  getUserActiveSession,
  getUserSessions,
  getUserSessionStats
};

