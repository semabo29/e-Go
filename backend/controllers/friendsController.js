const friendsService = require('../services/friendsService');


// informació del usuari
async function getFriends(req, res) {
  try {
    // Agafem els possibles paràmetres de la URL
    const { usuari_id } = req.query;

    const info = await friendsService.getFriends(parseInt(usuari_id));

    res.json(info);
  } catch (err) {
    console.error('Error obteniendo amigos del usuario:', err);
    res.status(500).json({ error: 'Error obteniendo amigos del usuario' });
  }
}

async function addFriend(req, res) {
  try {
    const { usuari_id1, usuari_id2 } = req.query;

    if (!usuari_id1 || !usuari_id2) {
      return res.status(400).json({ error: 'Falta alguno de los IDs de usuario' });
    }

    const added = await friendsService.addFriend(parseInt(usuari_id1), parseInt(usuari_id2));
    if (!added) {
      return res.status(404).json({ error: 'Usuario/s no encontrado/s' });
    }

    res.json(added);
  } catch (err) {
    console.error('Error añadiendo amigo:', err);
    res.status(500).json({ error: 'Error añadiendo amigo' });
  }
}

async function removeFriend(req, res) {
  try {
    const { usuari_id1, usuari_id2 } = req.query;

    if (!usuari_id1 || !usuari_id2) {
      return res.status(400).json({ error: 'Falta alguno de los IDs de usuario' });
    }

    const removed = await friendsService.removeFriend(parseInt(usuari_id1), parseInt(usuari_id2));
    if (!removed) {
      return res.status(404).json({ error: 'Usuario/s no encontrado/s' });
    }

    res.json(removed);
  } catch (err) {
    console.error('Error eliminando amigo:', err);
    res.status(500).json({ error: 'Error eliminando amigo' });
  }
}

async function acceptFriend(req, res) {
  try {
    const { usuari_id1, usuari_id2 } = req.query;

    if (!usuari_id1 || !usuari_id2) {
      return res.status(400).json({ error: 'Falta alguno de los IDs de usuario' });
    }

    const accepted = await friendsService.acceptFriend(parseInt(usuari_id1), parseInt(usuari_id2));
    if (!accepted) {
      return res.status(404).json({ error: 'Solicitud de amistad no encontrada' });
    }

    res.json(accepted);
  } catch (err) {
    console.error('Error aceptando solicitud de amistad:', err);
    res.status(500).json({ error: 'Error aceptando solicitud de amistad' });
  }
}

module.exports = {
  getFriends,
  addFriend,
  removeFriend,
  acceptFriend
};