const favoriteModel = require('../models/favoriteModel');

async function addFavorite(usuariId, estacioId) {
    //Si no ens donen els parametres llençem exepció, si no cridem al model per l'Insert
  if (!usuariId || !estacioId) throw new Error('Faltan IDs de usuario o estación');
  return await favoriteModel.addFavorite(usuariId, estacioId);
}

async function removeFavorite(usuariId, estacioId) {
    //Si no ens donen els parametres llençem exepció, si no cridem al model per el Delete
  if (!usuariId || !estacioId) throw new Error('Faltan IDs de usuario o estación');
  return await favoriteModel.removeFavorite(usuariId, estacioId);
}

async function getUserFavorites(usuariId) {
    //Si no ens donen els parametres llençem exepció, si no cridem al model per el Select
  if (!usuariId) throw new Error('ID de usuario no proporcionado');
  return await favoriteModel.getFavoritesByUser(usuariId);
}

module.exports = {
  addFavorite,
  removeFavorite,
  getUserFavorites
};