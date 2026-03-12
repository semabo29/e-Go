const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');

// List all stations
router.get('/', stationController.getStations);

// Sync stations manually (optional, scheduler does this automatically)
router.get('/sync', stationController.syncStations);

module.exports = router;