const stationService = require('../services/stationService');


// obtener todas las estaciones
async function getStations(req, res) {
  try {
    const stations = await stationService.getStations();
    res.json(stations);
  } catch (err) {
    console.error('Error obteniendo estaciones:', err);
    res.status(500).json({ error: 'Error obteniendo estaciones' });
  }
}

// sincronizar las estaciones
async function syncStations(req, res) {
  try {
    const count = await stationService.syncStations();
    res.json({
      success: true,
      mensaje: 'Sincronización procesada',
      totalProcesados: count
    });
  } catch (err) {
    console.error('Error sincronizando estaciones:', err);
    res.status(500).json({ error: 'Error sincronizando estaciones' });
  }
}

module.exports = {
  getStations,
  syncStations
};