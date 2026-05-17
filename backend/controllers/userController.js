const userService = require('../services/userService');
const { respondIfBannedUserId } = require('../middleware/requireNotBanned');

// informació del usuari
async function getUser(req, res) {
  try {
    // Agafem els possibles paràmetres de la URL
    const { usuari_id } = req.query;
    if (await respondIfBannedUserId(res, usuari_id)) return;

    const info = await userService.getUser(usuari_id);

    res.json(info);
  } catch (err) {
    console.error('Error obteniendo información del usuario:', err);
    res.status(500).json({ error: 'Error obteniendo información del usuario' });
  }
}

async function updateUser(req, res) {
  try {
    const { usuari_id } = req.query;
    const { username } = req.body;

    if (!usuari_id) {
      return res.status(400).json({ error: 'Falta usuari_id' });
    }
    if (!username) {
      return res.status(400).json({ error: 'Falta el campo username' });
    }

    const updated = await userService.updateUser(usuari_id, username);
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error actualizando información del usuario:', err);
    res.status(500).json({ error: 'Error actualizando información del usuario' });
  }
}

module.exports = {
  getUser,
  updateUser
};