/**
 * Inspecciona 1 elemento de la API Generalitat para ver qué campo usar como clave.
 * Uso: node scripts/inspect-station-api.js
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.APP_TOKEN;
const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';

(async () => {
  if (!TOKEN) {
    console.error('Falta APP_TOKEN en backend/.env');
    process.exit(1);
  }

  const response = await axios.get(URL, {
    headers: { 'X-App-Token': TOKEN },
  });

  let estaciones = response.data;
  if (!Array.isArray(estaciones) && estaciones.results) estaciones = estaciones.results;
  if (!Array.isArray(estaciones)) throw new Error('Formato de API inválido');

  const first = estaciones.find((est) => est && est.latitud && est.longitud) || estaciones[0];
  if (!first) {
    console.error('No hay datos en la API');
    process.exit(1);
  }

  const sample = {
    ':id': first[':id'],
    id: first.id,
    external_id: first.external_id,
    // posibles candidatos típicos (depende del dataset)
    externalId: first.externalId,
    id_estacio: first.id_estacio,
    nom: first.designaci_descriptiva || first.nom,
    latitud: first.latitud,
    longitud: first.longitud,
  };

  console.log('sample keys:', Object.keys(first).slice(0, 30));
  console.log('sample ids:', sample);
})();

