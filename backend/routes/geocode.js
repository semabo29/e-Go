const express = require('express');
const geocodeController = require('../controllers/geocodeController');

const router = express.Router();

router.get('/autocomplete', geocodeController.autocomplete);
router.get('/place', geocodeController.place);

module.exports = router;
