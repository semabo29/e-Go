const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const adminStationController = require('../controllers/adminStationController');
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

module.exports = router;
