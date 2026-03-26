const axios = require('axios');
const stationModel = require('../models/stationModel');

const TOKEN = process.env.APP_TOKEN;
const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';

async function syncStations() {
  const response = await axios.get(URL, {
    headers: { 'X-App-Token': TOKEN }
  });

  let estaciones = response.data;
  if (!Array.isArray(estaciones) && estaciones.results) estaciones = estaciones.results;
  if (!Array.isArray(estaciones)) throw new Error('Formato de API inválido');


  const estacionesValidas = estaciones.filter(est => est.latitud && est.longitud);
  await Promise.all(estacionesValidas.map(est => stationModel.upsertStation(est)));

  let count = estacionesValidas.length;
  console.log(`Sincronizadas ${count} estaciones`);
  return count;
}

async function getStations(filters) {
  return stationModel.getAllStations(filters);
}

// Funció per buscar estacions
async function searchStations(q, filters) {
  return stationModel.searchStations(q, filters);
}

module.exports = { syncStations, getStations, searchStations };
