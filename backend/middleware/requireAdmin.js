const jwt = require('jsonwebtoken');
const { ensureUserNotBanned } = require('./requireNotBanned');

async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta token de autorizacion' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET no configurado' });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const banStatus = await ensureUserNotBanned(payload.sub);
    if (!banStatus.ok) {
      return res.status(banStatus.status).json({ error: banStatus.error });
    }
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = { requireAdmin };
