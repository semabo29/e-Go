const stationService = require('../services/stationService');


// obtener todas las estaciones
async function getStations(req, res) {
  try {
    // Agafem els possibles paràmetres de la URL
    const { minKw, maxKw, connectorType } = req.query;

    // Creem un objecte amb els filtres
    const filters = { minKw, maxKw, connectorType};

    const stations = await stationService.getStations(filters);
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