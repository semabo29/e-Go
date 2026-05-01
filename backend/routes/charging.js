const express = require('express');
const router = express.Router();
const chargingController = require('../controllers/chargingController');

// Iniciar sesión de carga
router.post('/start', chargingController.startCharging);

// Finalizar sesión de carga
router.post('/end', chargingController.endCharging);

// Cancelar sesión de carga
router.post('/cancel', chargingController.cancelCharging);

// Obtener sesión activa del usuario
router.get('/active', chargingController.getActiveSession);

// Obtener todas las sesiones del usuario
router.get('/sessions/:usuari_id', chargingController.getUserSessions);

// Obtener estadísticas de carga del usuario
router.get('/stats/:usuari_id', chargingController.getChargingStats);

module.exports = router;

