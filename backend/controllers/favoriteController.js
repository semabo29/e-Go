const favoriteService = require('../services/favoriteService');
const { respondIfBannedUserId } = require('../middleware/requireNotBanned');

async function addFavorite(req, res) {
  try {
    //Extreu els ids del usuari i de l'estació de la peticion del frontend
    const { usuari_id, estacio_id } = req.body;
    if (await respondIfBannedUserId(res, usuari_id)) return;
    //Crida al controlador
    await favoriteService.addFavorite(usuari_id, estacio_id);

    //Fent el criteri d'acceptació de (mostrar mensaje de confirmación efímero)
    res.status(201).json({
      success: true,
      message: 'Estació afegida a preferits'
    });
  } catch (err) {
    console.error('Error al añadir favorito:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

async function removeFavorite(req, res) {
  try {
    const { usuari_id, estacio_id } = req.body;
    if (await respondIfBannedUserId(res, usuari_id)) return;
    await favoriteService.removeFavorite(usuari_id, estacio_id);

    res.json({
      success: true,
      message: 'Estació eliminada de preferits'
    });
  } catch (err) {
    console.error('Error al eliminar favorito:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

async function getFavorites(req, res) {
  try {
    const { usuari_id } = req.query; // Se puede pasar por query param
    if (await respondIfBannedUserId(res, usuari_id)) return;
    const favorites = await favoriteService.getUserFavorites(usuari_id);
    res.json(favorites);
  } catch (err) {
    console.error('Error al obtener favoritos:', err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
}

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites
};