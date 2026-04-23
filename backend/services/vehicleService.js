const vehicleModel = require('../models/vehicleModel');

async function addCar(usuariId, nom, potencia, conector, corrent) {
    //Si no ens donen els parametres llençem exepció, si no cridem al model per a l'Insert
  if ((!usuariId) || (!nom) || (!potencia) || (!conector) || (!corrent)) throw new Error('Faltan parametres');
  add = await vehicleModel.addCar(usuariId, nom, potencia, conector, corrent);
  if(add == null) throw new Error('El vehicle ja existia');
  return add;
}

async function removeVehicle(usuariId, nom) {
    //Si no ens donen els parametres llençem exepció, si no cridem al model per el Delete
  if (!usuariId || !nom) throw new Error('Falta ID dusuari o nom de vehicle');
  return await vehicleModel.removeVehicle(usuariId, nom);
}

async function getUserVehicles(usuariId) {
    //Si no ens donen el paràmetre llençem exepció, si no cridem al model per al Select
  if (!usuariId) throw new Error('ID dusuari no proporcionat');
  return await vehicleModel.getVehiclesByUser(usuariId);
}

module.exports = {
  addCar,
  removeVehicle,
  getUserVehicles
};