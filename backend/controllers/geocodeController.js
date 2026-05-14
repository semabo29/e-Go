const geocodeService = require('../services/geocodeService');

async function autocomplete(req, res) {
  try {
    const input = String(req.query.input || '').trim();
    if (input.length < 3) {
      return res.json([]);
    }
    const results = await geocodeService.autocompleteAddress(input);
    return res.json(results);
  } catch (error) {
    if (error.code === 'CONFIG') {
      return res.status(503).json({ error: 'Cerca d’adreces no disponible (falta configuració del servidor).' });
    }
    if (error.code === 'VALIDATION') {
      return res.status(400).json({ error: error.message });
    }
    console.error('geocode autocomplete:', error);
    return res.status(502).json({ error: 'No s’ha pogut contactar amb el servei de mapes.' });
  }
}

async function place(req, res) {
  try {
    const placeId = String(req.query.placeId || '').trim();
    if (!placeId) {
      return res.status(400).json({ error: 'placeId és obligatori' });
    }
    const details = await geocodeService.placeDetails(placeId);
    return res.json(details);
  } catch (error) {
    if (error.code === 'CONFIG') {
      return res.status(503).json({ error: 'Cerca d’adreces no disponible (falta configuració del servidor).' });
    }
    if (error.code === 'VALIDATION') {
      return res.status(400).json({ error: error.message });
    }
    console.error('geocode place:', error);
    return res.status(502).json({ error: 'No s’ha pogut obtenir la ubicació.' });
  }
}

module.exports = {
  autocomplete,
  place,
};
