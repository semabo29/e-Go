const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const adminStationController = require('../controllers/adminStationController');
const adminCompanyRequestController = require('../controllers/adminCompanyRequestController');
const adminUserController = require('../controllers/adminUserController');
const adminIncidenciaController = require('../controllers/adminIncidenciaController');
const { pool, USUARIOS_TABLE } = require('../lib/db');

const router = express.Router();

// Verifica el JWT admin y devuelve el payload
router.get('/me', requireAdmin, async (req, res) => {
  return res.json({ admin: req.admin });
});

// Devuelve el usuario asociado al admin (tabla usuarios)
router.get('/user', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, username, created_at, updated_at FROM ${USUARIOS_TABLE} WHERE id = $1`,
      [req.admin.sub]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ user });
  } catch (err) {
    console.error('Error en /admin/user:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// CRUD estaciones manuales
router.post('/stations', requireAdmin, adminStationController.createManualStation);
router.patch('/stations/:id', requireAdmin, adminStationController.updateManualStation);
router.delete('/stations/:id', requireAdmin, adminStationController.deleteManualStation);
router.get('/stations/mine', requireAdmin, adminStationController.listMyManualStations);
router.get('/station-requests/pending', requireAdmin, adminCompanyRequestController.listPendingRequests);
router.post('/station-requests/:id/approve', requireAdmin, adminCompanyRequestController.approveRequest);
router.post('/station-requests/:id/reject', requireAdmin, adminCompanyRequestController.rejectRequest);
router.get('/users', requireAdmin, adminUserController.listUsers);
router.patch('/users/:id/ban', requireAdmin, adminUserController.setUserBan);

// Gestión de incidencias
router.get('/incidencias/pending', requireAdmin, adminIncidenciaController.listPending);
router.get('/incidencias/history', requireAdmin, adminIncidenciaController.listHistory);
router.get('/incidencias/:id', requireAdmin, adminIncidenciaController.getById);
router.post('/incidencias/:id/validate', requireAdmin, adminIncidenciaController.validate);
router.post('/incidencias/:id/reject', requireAdmin, adminIncidenciaController.reject);
router.post('/incidencias/:id/resolve', requireAdmin, adminIncidenciaController.resolve);

module.exports = router;
