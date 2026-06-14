const vehicleService = require('../services/vehicleService');
const { respondIfBannedUserId } = require('../middleware/requireNotBanned');

async function addCar(req, res) {
  try {
    //Extreu la informació de la petició del frontend
    const { usuari_id, v_nom, v_potencia, v_conector, v_corrent } = req.body;
    if (await respondIfBannedUserId(res, usuari_id)) return;

    //Crida al controlador
    await vehicleService.addCar(usuari_id, v_nom, v_potencia, v_conector, v_corrent);

    res.status(201).json({
      success: true,
      message: 'Vehicle afegit'
    });
  } catch (err) {
    console.error('Error al afegir vehicle:', err);
    res.status(500).json({ error: 'Error al processar la solicitud' });
  }
}

async function removeVehicle(req, res) {
  try {
    const { usuari_id, v_nom } = req.body;
    if (await respondIfBannedUserId(res, usuari_id)) return;

    await vehicleService.removeVehicle(usuari_id, v_nom);

    res.json({
      success: true,
      message: 'Vehicle eliminat'
    });
  } catch (err) {
    console.error('Error al eliminar el vehicle:', err);
    res.status(500).json({ error: 'Error al processar la solicitud' });
  }
}

async function getVehicles(req, res) {
  try {
    const { usuari_id } = req.query; // Se puede pasar por query param
    if (await respondIfBannedUserId(res, usuari_id)) return;
    const vehicles = await vehicleService.getUserVehicles(usuari_id);
    res.json(vehicles);
  } catch (err) {
    console.error('Error al obtenir vehicles:', err);
    res.status(500).json({ error: 'Error al obtenir vehicles' });
  }
}

module.exports = {
  addCar,
  removeVehicle,
  getVehicles
};