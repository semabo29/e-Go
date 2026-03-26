// Login y registro: POST /auth/google, POST /auth/register
const express = require('express');
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const { pool, USUARIOS_TABLE, ADMINS_TABLE } = require('../lib/db');
const { getGooglePayload } = require('../lib/authHelpers');

const router = express.Router();

router.post('/google', authController.googleLogin);
router.post('/register', authController.register);

// Admin login: solo permite emails con fila en admins. Devuelve JWT para backoffice.
router.post('/admin/google', async (req, res) => {
  try {
    const hasIdToken = !!req.body.idToken;
    const hasCode = !!(req.body.code && req.body.redirectUri);
    if (!hasIdToken && !hasCode) {
      return res.status(400).json({ error: 'Envia idToken o code + redirectUri' });
    }

    const payload = await getGooglePayload(req.body);
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Token de Google no valido. Envia idToken o code + redirectUri.' });
    }
    const email = payload.email;

    const adminResult = await pool.query(
      `SELECT u.id, u.email, u.username, a.created_at AS admin_since
       FROM ${ADMINS_TABLE} a
       JOIN ${USUARIOS_TABLE} u ON u.id = a.user_id
       WHERE u.email = $1`,
      [email]
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      return res.status(403).json({ error: 'No eres admin' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET no configurado' });
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: 'admin' },
      secret,
      { expiresIn }
    );

    return res.json({ admin, token, expiresIn });
  } catch (err) {
    console.error('Error en /auth/admin/google:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
