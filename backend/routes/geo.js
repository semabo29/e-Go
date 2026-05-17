const express = require('express');
const geoController = require('../controllers/geoController');

const router = express.Router();

router.get('/search', geoController.searchAddress);
router.get('/reverse', geoController.reverseAddress);

module.exports = router;
