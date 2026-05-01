const chargingSessionModel = require('../models/chargingSessionModel');
const userPointsModel = require('../models/userPointsModel');
const subscriptionModel = require('../models/subscriptionModel');

const POINTS_PER_MINUTE = 10; // 1 punto por minuto
const PREMIUM_MULTIPLIER = 2.0; // 2x puntos para usuarios Premium
const MIN_SESSION_DURATION = 1; // Mínimo 1 minuto para registrar una sesión

/**
 * Calcula los puntos ganados en una sesión de carga
 * @param {number} durationMinutes - Duración de la sesión en minutos
 * @param {boolean} isPremium - Si el usuario tiene suscripción Premium
 * @returns {object} { basePoints, multiplier, totalPoints }
 */
function calculateChargingPoints(durationMinutes, isPremium = false) {
  // Asegurar que la duración es válida
  const validDuration = Math.max(Math.ceil(durationMinutes), MIN_SESSION_DURATION);

  // Calcular puntos base
  const basePoints = validDuration * POINTS_PER_MINUTE;

  // Aplicar multiplicador Premium
  const multiplier = isPremium ? PREMIUM_MULTIPLIER : 1.0;
  const totalPoints = Math.floor(basePoints * multiplier);

  return {
    basePoints,
    multiplier,
    totalPoints,
    durationMinutes: validDuration
  };
}

/**
 * Finaliza una sesión de carga y asigna puntos al usuario
 * @param {number} sessionId - ID de la sesión
 * @param {number} usuariId - ID del usuario
 * @param {number} durationMinutes - Duración en minutos
 * @param {string} endReason - Razón de finalización ('manual', 'distance_exceeded', etc.)
 * @returns {object} Sesión actualizada con puntos asignados
 */
async function endChargingSession(sessionId, usuariId, durationMinutes, endReason = 'manual') {
  try {
    // 1. Cercar la sessió per ID o la sessió activa de l'usuari
    let sessionToUpdateId = sessionId;
    if (!sessionToUpdateId || sessionToUpdateId === 0) {
      const activeSession = await chargingSessionModel.getUserActiveSession(usuariId);
      if (activeSession) {
        sessionToUpdateId = activeSession.id;
      } else {
        throw new Error('No se encontró ninguna sesión activa');
      }
    }

    // 2. VERIFICACIÓ CRUCIAL: Comprovar si la sessió ja ha estat finalitzada
    const currentSession = await chargingSessionModel.getSessionById(sessionToUpdateId);
    if (currentSession && currentSession.status === 'completed') {
      console.log('Sessió ja finalitzada anteriorment, evitant duplicats.');
      return {
        session: currentSession,
        points: { totalPoints: currentSession.puntos_totales, basePoints: currentSession.puntos_totales / (currentSession.multiplicador_premium || 1), multiplier: currentSession.multiplicador_premium },
        isPremium: currentSession.multiplicador_premium > 1
      };
    }

    // 3. Si no està finalitzada, calculem i guardem
    const subscription = await subscriptionModel.findByUserId(usuariId);
    const isPremium = subscription && subscription.status === 'active';
    const pointsData = calculateChargingPoints(durationMinutes, isPremium);

    const updatedSession = await chargingSessionModel.endSession(
      sessionToUpdateId,
      pointsData.durationMinutes,
      pointsData.totalPoints,
      endReason,
      pointsData.multiplier
    );

    // Només sumem punts a l'usuari si la sessió s'ha actualitzat ara
    await userPointsModel.addPoints(usuariId, pointsData.totalPoints);

    return { session: updatedSession, points: pointsData, isPremium };
  } catch (error) {
    console.error('Error al finalizar sesión de carga:', error);
    throw error;
  }
}


/**
 * Obtiene estadísticas de carga del usuario
 * @param {number} usuariId - ID del usuario
 * @returns {object} Estadísticas completas
 */
async function getUserChargingStats(usuariId) {
  try {
    const sessionStats = await chargingSessionModel.getUserSessionStats(usuariId);
    const userPoints = await userPointsModel.getUserPoints(usuariId);
    const userRanking = await userPointsModel.getUserRanking(usuariId);

    return {
      sessionStats,
      userPoints,
      userRanking
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de carga:', error);
    throw error;
  }
}

module.exports = {
  calculateChargingPoints,
  endChargingSession,
  getUserChargingStats,
  POINTS_PER_MINUTE,
  PREMIUM_MULTIPLIER,
  MIN_SESSION_DURATION
};

