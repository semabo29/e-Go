const userModel = require('../models/userModel');

async function ensureUserNotBanned(userId) {
  const user = await userModel.findByIdWithBanStatus(userId);
  if (!user) {
    return { ok: false, status: 401, error: 'Usuario no encontrado' };
  }
  if (user.is_banned) {
    return {
      ok: false,
      status: 403,
      error: 'Usuario baneado',
      banned_reason: user.banned_reason ?? null,
    };
  }
  return { ok: true };
}

/**
 * Si el id es un usuario existente y baneado, responde 403 y devuelve true.
 * Si falta id, no es numerico o el usuario no existe, no responde (devuelve false).
 */
async function respondIfBannedUserId(res, rawUserId) {
  const id = Number(rawUserId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const user = await userModel.findByIdWithBanStatus(id);
  if (!user || !user.is_banned) return false;
  res.status(403).json({
    code: 'USER_BANNED',
    error: 'Esta cuenta esta baneada',
    banned_reason: user.banned_reason ?? null,
  });
  return true;
}

module.exports = { ensureUserNotBanned, respondIfBannedUserId };
