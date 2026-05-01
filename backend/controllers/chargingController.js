const chargingSessionModel = require('../models/chargingSessionModel');
const chargingService = require('../services/chargingService');

/**
 * Inicia una sesión de carga
 * POST /charging/start
 */
async function startCharging(req, res) {
  try {
    const { usuari_id, estacio_id, ubicacion_lat, ubicacion_lon } = req.body;

    // Validar datos requeridos
    if (!usuari_id || !estacio_id || typeof ubicacion_lat !== 'number' || typeof ubicacion_lon !== 'number') {
      return res.status(400).json({
        error: 'Parámetros inválidos: usuari_id, estacio_id, ubicacion_lat, ubicacion_lon requeridos'
      });
    }

    // Crear sesión
    const session = await chargingSessionModel.startSession(
      usuari_id,
      estacio_id,
      ubicacion_lat,
      ubicacion_lon
    );

    return res.status(201).json({
      success: true,
      message: 'Sesión de carga iniciada',
      session
    });
  } catch (error) {
    console.error('Error al iniciar sesión de carga:', error);
    return res.status(500).json({
      error: 'Error al iniciar sesión de carga'
    });
  }
}

/**
 * Finaliza una sesión de carga
 * POST /charging/end
 */
async function endCharging(req, res) {
  try {
    const { session_id, usuari_id, duration_minutes, ubicacion_final_lat, ubicacion_final_lon, end_reason } = req.body;

    // Validar datos requeridos
    if (!session_id || !usuari_id || typeof duration_minutes !== 'number') {
      return res.status(400).json({
        error: 'Parámetros inválidos: session_id, usuari_id, duration_minutes requeridos'
      });
    }

    // Finalizar sesión y calcular puntos
    const result = await chargingService.endChargingSession(
      session_id,
      usuari_id,
      duration_minutes,
      end_reason || 'manual'
    );

    return res.json({
      success: true,
      message: 'Sesión finalizada correctamente',
      session: result.session,
      pointsGained: result.points,
      isPremium: result.isPremium
    });
  } catch (error) {
    console.error('Error al finalizar sesión de carga:', error);
    return res.status(500).json({
      error: 'Error al finalizar sesión de carga'
    });
  }
}

/**
 * Obtiene la sesión activa del usuario
 * GET /charging/active
 */
async function getActiveSession(req, res) {
  try {
    const { usuari_id } = req.query;

    if (!usuari_id) {
      return res.status(400).json({
        error: 'Parámetro requerido: usuari_id'
      });
    }

    const session = await chargingSessionModel.getUserActiveSession(usuari_id);

    return res.json({
      success: true,
      session: session || null
    });
  } catch (error) {
    console.error('Error al obtener sesión activa:', error);
    return res.status(500).json({
      error: 'Error al obtener sesión activa'
    });
  }
}

/**
 * Obtiene todas las sesiones del usuario
 * GET /charging/sessions/:usuari_id
 */
async function getUserSessions(req, res) {
  try {
    const { usuari_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!usuari_id) {
      return res.status(400).json({
        error: 'Parámetro requerido: usuari_id'
      });
    }

    const sessions = await chargingSessionModel.getUserSessions(usuari_id, parseInt(limit), parseInt(offset));

    return res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    return res.status(500).json({
      error: 'Error al obtener sesiones'
    });
  }
}

/**
 * Obtiene estadísticas de carga del usuario
 * GET /charging/stats/:usuari_id
 */
async function getChargingStats(req, res) {
  try {
    const { usuari_id } = req.params;

    if (!usuari_id) {
      return res.status(400).json({
        error: 'Parámetro requerido: usuari_id'
      });
    }

    const stats = await chargingService.getUserChargingStats(usuari_id);

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({
      error: 'Error al obtener estadísticas'
    });
  }
}

/**
 * Cancela una sesión de carga en curso
 * POST /charging/cancel
 */
async function cancelCharging(req, res) {
  try {
    const { session_id, reason } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: 'Parámetro requerido: session_id'
      });
    }

    const session = await chargingSessionModel.cancelSession(session_id, reason || 'manual');

    return res.json({
      success: true,
      message: 'Sesión cancelada',
      session
    });
  } catch (error) {
    console.error('Error al cancelar sesión:', error);
    return res.status(500).json({
      error: 'Error al cancelar sesión'
    });
  }
}

module.exports = {
  startCharging,
  endCharging,
  getActiveSession,
  getUserSessions,
  getChargingStats,
  cancelCharging
};

