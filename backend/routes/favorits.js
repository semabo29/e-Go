//Utilitzem el framework express
const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

//Añadir a favoritos
router.post('/', favoriteController.addFavorite);

//Eliminar de favoritos (puedes usar DELETE y pasar IDs en el body o URL)
router.delete('/', favoriteController.removeFavorite);

//Obtener lista de favoritos de un usuario
router.get('/', favoriteController.getFavorites);

module.exports = router;