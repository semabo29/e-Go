const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// Guardar vehicle
router.post('/', vehicleController.addCar);

//Obtenir llista de vehicles d'un usuari
router.get('/', vehicleController.getVehicles);

module.exports = router;
