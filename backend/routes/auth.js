// Login y registro: POST /auth/google, POST /auth/register
const express = require('express');
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const { pool, USUARIOS_TABLE, ADMINS_TABLE, EMPRESAS_TABLE } = require('../lib/db');
const { getGooglePayload } = require('../lib/authHelpers');

const router = express.Router();

router.post('/google', authController.googleLogin);
router.post('/local/login', authController.localLogin);
router.post('/local/register', authController.localRegister);
router.post('/register', authController.register);

router.post('/admin/local/login', authController.adminLocalLogin);
router.post('/company/local/login', authController.companyLocalLogin);

async function loginPrivilegedUser(req, res, { role, relationTable, selectFields, forbiddenMessage }) {
  const hasIdToken = !!req.body.idToken;
  const hasCode = !!(req.body.code && req.body.redirectUri);
  if (!hasIdToken && !hasCode) {
    return res.status(400).json({ error: 'Envia idToken o code + redirectUri' });
  }

  const payload = await getGooglePayload(req.body);
  if (!payload?.email) {
    return res.status(401).json({ error: 'Token de Google no valido. Envia idToken o code + redirectUri.' });
  }
  const email = payload.email;
  const banCheck = await pool.query(
    `SELECT is_banned FROM ${USUARIOS_TABLE} WHERE email = $1`,
    [email]
  );
  if (banCheck.rows[0]?.is_banned) {
    return res.status(403).json({ error: 'Esta cuenta esta baneada' });
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM ${relationTable} r
     JOIN ${USUARIOS_TABLE} u ON u.id = r.user_id
     WHERE u.email = $1`,
    [email]
  );
  const account = result.rows[0];
  if (!account) {
    return res.status(403).json({ error: forbiddenMessage });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET no configurado' });
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign(
    { sub: account.id, user_id: account.user_id, email: account.email, role },
    secret,
    { expiresIn }
  );

  return res.json({ [role]: account, token, expiresIn });
}

// Admin login: solo permite emails con fila en admins. Devuelve JWT para backoffice.
router.post('/admin/google', async (req, res) => {
  try {
    return await loginPrivilegedUser(req, res, {
      role: 'admin',
      relationTable: ADMINS_TABLE,
      selectFields: 'u.id, r.user_id, u.email, u.username, r.created_at AS admin_since',
      forbiddenMessage: 'No eres admin',
    });
  } catch (err) {
    console.error('Error en /auth/admin/google:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/company/google', async (req, res) => {
  try {
    return await loginPrivilegedUser(req, res, {
      role: 'company',
      relationTable: EMPRESAS_TABLE,
      selectFields: 'u.id, r.user_id, u.email, u.username, r.nombre, r.created_at AS company_since',
      forbiddenMessage: 'No eres una empresa autorizada',
    });
  } catch (err) {
    console.error('Error en /auth/company/google:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
