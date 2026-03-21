const stationService = require('../services/stationService');


// obtener todas las estaciones
async function getStations(req, res) {
  try {
    // Agafem els possibles paràmetres de la URL
    const { minKw, maxKw, connectorType, ac_dc, north, south, east, west } = req.query;

    if (minKw && maxKw && parseFloat(minKw) > parseFloat(maxKw)) {
      return res.status(400).json({ error: 'La potencia mínima no puede ser mayor que la máxima' });
    }

    // Creem un objecte amb els filtres
    const filters = { minKw, maxKw, connectorType, ac_dc, north, south, east, west};

    const stations = await stationService.getStations(filters);
    res.json(stations);
  } catch (err) {
    console.error('Error obteniendo estaciones:', err);
    res.status(500).json({ error: 'Error obteniendo estaciones' });
  }
}

// Buscar estaciones por texto (nom, adreça, municipi)
async function searchStations(req, res) {
  try {
    const { q, minKw, maxKw, connectorType, ac_dc } = req.query;

    if (minKw && maxKw && parseFloat(minKw) > parseFloat(maxKw)) {
      return res.status(400).json({ error: 'La potencia mínima no puede ser mayor que la máxima' });
    }

    // Si no hi ha text de cerca, retornem un array buit
    if (!q) {
      return res.json([]);
    }

    const filters = { minKw, maxKw, connectorType, ac_dc };

    // Cridem al servei passant el text i els filtres
    const stations = await stationService.searchStations(q, filters);
    res.json(stations);
  } catch (err) {
    console.error('Error buscando estaciones:', err);
    res.status(500).json({ error: 'Error buscando estaciones' });
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
  searchStations,
  syncStations
};