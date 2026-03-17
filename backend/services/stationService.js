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

  let count = 0;
  for (const est of estaciones) {
    if (!est.latitud || !est.longitud) continue; //si no hay coordenadas, no se guarda
    await stationModel.upsertStation(est); //guarda o actualiza
    count++;
  }

  console.log(`Sincronizadas ${count} estaciones`);
  return count;
}

async function getStations() {
  return stationModel.getAllStations();
}

module.exports = { syncStations, getStations };