const userModel = require('../models/userModel');

async function ensureUserNotBanned(userId) {
  const user = await userModel.findByIdWithBanStatus(userId);
  if (!user) {
    return { ok: false, status: 401, error: 'Usuario no encontrado' };
  }
  if (user.is_banned) {
    return { ok: false, status: 403, error: 'Usuario baneado' };
  }
  return { ok: true };
}

module.exports = { ensureUserNotBanned };
