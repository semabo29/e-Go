const express = require('express');
const router = express.Router();
const skinController = require('../controllers/skinController');

// Obtener catálogo completo de la tienda
router.get('/', skinController.getAllSkins);

// Rutas específicas de un conductor
router.get('/conductor/:id', skinController.getUserSkins);
router.post('/conductor/:id/buy', skinController.buySkin);
router.put('/conductor/:id/equip', skinController.equipSkin);

module.exports = router;