const express = require('express');
const { requireCompany } = require('../middleware/requireCompany');
const companyStationController = require('../controllers/companyStationController');
const userModel = require('../models/userModel');
const { pool, USUARIOS_TABLE, EMPRESAS_TABLE } = require('../lib/db');

const router = express.Router();

/** Clave de fila en empresas: JWT suele traer user_id (PK); si no, sub. */
function empresaUserIdFromToken(req) {
  let n = Number(req.company.user_id);
  if (!Number.isFinite(n) || n <= 0) n = Number(req.company.sub);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

router.get('/me', requireCompany, async (req, res) => {
  return res.json({ company: req.company });
});

router.get('/user', requireCompany, async (req, res) => {
  try {
    const empresaUid = empresaUserIdFromToken(req);
    if (!Number.isFinite(empresaUid)) {
      return res.status(400).json({ error: 'Token de empresa invalido' });
    }
    const result = await pool.query(
      `SELECT u.id, e.user_id, u.email, u.username, e.nombre, e.created_at
       FROM ${EMPRESAS_TABLE} e
       JOIN ${USUARIOS_TABLE} u ON u.id = e.user_id
       WHERE e.user_id = $1`,
      [empresaUid]
    );
    const company = result.rows[0];
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });
    return res.json({ company });
  } catch (err) {
    console.error('Error en /company/user:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

async function updateCompanyProfileHandler(req, res) {
  try {
    const empresaUid = empresaUserIdFromToken(req);
    if (!Number.isFinite(empresaUid)) {
      return res.status(400).json({ error: 'Token de empresa invalido' });
    }
    const row = await userModel.updateCompanyNombre(empresaUid, req.body?.nombre);
    if (!row) return res.status(404).json({ error: 'Empresa no encontrada' });
    return res.json({ company: row });
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error en /company/profile:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

router.patch('/profile', requireCompany, updateCompanyProfileHandler);
router.put('/profile', requireCompany, updateCompanyProfileHandler);

router.get('/stations/mine', requireCompany, companyStationController.listMyStations);
router.get('/station-requests/mine', requireCompany, companyStationController.listMyRequests);
router.post('/stations', requireCompany, companyStationController.requestCreateStation);
router.patch('/stations/:id', requireCompany, companyStationController.requestUpdateStation);
router.delete('/stations/:id', requireCompany, companyStationController.requestDeleteStation);

module.exports = router;
