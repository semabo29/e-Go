const jwt = require('jsonwebtoken');
const { ensureUserNotBanned } = require('./requireNotBanned');

function getUserIdFromPayload(payload) {
  const raw = payload?.id ?? payload?.sub;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Exige JWT de conductor válido, usuario no baneado.
 * Expone req.user (payload) y req.authUserId (número).
 */
async function requireConductorAuth(req, res, next) {
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
    const userId = getUserIdFromPayload(payload);
    if (!userId) {
      return res.status(401).json({ error: 'Token invalido o expirado' });
    }

    const banStatus = await ensureUserNotBanned(userId);
    if (!banStatus.ok) {
      const body = { error: banStatus.error };
      if (banStatus.status === 403) {
        body.code = 'USER_BANNED';
        body.banned_reason = banStatus.banned_reason ?? null;
      }
      return res.status(banStatus.status).json(body);
    }

    req.user = payload;
    req.authUserId = userId;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

/** Comprueba que rawUserId coincide con req.authUserId. Devuelve false si ya respondió. */
function assertSelfUserId(req, res, rawUserId) {
  const requested = Number(rawUserId);
  if (!Number.isInteger(requested) || requested <= 0) {
    res.status(400).json({ error: 'usuari_id invalido' });
    return false;
  }
  if (req.authUserId !== requested) {
    res.status(403).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

/**
 * Middleware: el campo indicado debe coincidir con el usuario del JWT.
 */
function requireSelfUserId({ from = 'query', field = 'usuari_id' } = {}) {
  return (req, res, next) => {
    let raw;
    if (from === 'query') raw = req.query[field];
    else if (from === 'body') raw = req.body[field];
    else if (from === 'params') raw = req.params[field];
    else if (from === 'bodyOrQuery') raw = req.body[field] ?? req.query[field];

    if (raw === undefined || raw === null || raw === '') {
      return res.status(400).json({ error: `${field} es requerido` });
    }
    if (!assertSelfUserId(req, res, raw)) return;
    return next();
  };
}

/** En amistades, usuari_id1 debe ser el usuario autenticado. */
function requireSelfAsFriendActor(req, res, next) {
  const raw = req.query.usuari_id1 ?? req.body.usuari_id1;
  if (raw === undefined || raw === null || raw === '') {
    return res.status(400).json({ error: 'usuari_id1 es requerido' });
  }
  if (!assertSelfUserId(req, res, raw)) return;
  return next();
}

module.exports = {
  requireConductorAuth,
  assertSelfUserId,
  requireSelfUserId,
  requireSelfAsFriendActor,
  getUserIdFromPayload,
};
