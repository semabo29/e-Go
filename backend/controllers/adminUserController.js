const userModel = require('../models/userModel');
const { scheduleSubscriptionCancelAtPeriodEnd } = require('../services/stripeSubscriptionCancelAtPeriodEnd');

async function listUsers(req, res) {
  try {
    const users = await userModel.listAllUsersForAdmin();
    return res.json({ users });
  } catch (err) {
    console.error('Error en GET /admin/users:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function setUserBan(req, res) {
  try {
    const userId = Number(req.params.id);
    const { is_banned, reason } = req.body || {};

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'id de usuario invalido' });
    }
    if (typeof is_banned !== 'boolean') {
      return res.status(400).json({ error: 'is_banned debe ser boolean' });
    }
    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason debe ser string' });
    }

    const updated = await userModel.setUserBanStatus(userId, {
      isBanned: is_banned,
      reason: reason ? reason.trim() : null,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let subscription_stripe = null;
    if (is_banned) {
      const subResult = await scheduleSubscriptionCancelAtPeriodEnd(userId);
      subscription_stripe = {
        ok: subResult.ok,
        reason: subResult.reason,
        ...(subResult.error ? { error: subResult.error } : {}),
      };
    }

    return res.json({ user: updated, ...(subscription_stripe ? { subscription_stripe } : {}) });
  } catch (err) {
    console.error('Error en PATCH /admin/users/:id/ban:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  listUsers,
  setUserBan,
};
