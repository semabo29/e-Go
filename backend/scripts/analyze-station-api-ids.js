/**
 * Analiza el dataset de estaciones de la Generalitat para ver qué campos
 * existen como claves estables.
 *
 * Uso: node scripts/analyze-station-api-ids.js
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.APP_TOKEN;
const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';

function isNumericString(v) {
  return typeof v === 'string' && /^[0-9]+$/.test(v);
}

function isRowId(v) {
  return typeof v === 'string' && v.startsWith('row-');
}

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

  const valid = estaciones.filter((est) => est && est.latitud && est.longitud);

  const stats = {
    totalValid: valid.length,
    id_numeric: 0,
    id_row_like: 0,
    id_missing: 0,
    colon_id_row_like: 0,
    id_estacio_numeric: 0,
    id_estacio_missing: 0,
  };

  for (const est of valid) {
    if (est.id === undefined || est.id === null || est.id === '') stats.id_missing++;
    else if (isNumericString(est.id)) stats.id_numeric++;
    else if (isRowId(est.id)) stats.id_row_like++;

    if (isRowId(est[':id'])) stats.colon_id_row_like++;

    if (est.id_estacio === undefined || est.id_estacio === null || est.id_estacio === '') stats.id_estacio_missing++;
    else if (isNumericString(String(est.id_estacio))) stats.id_estacio_numeric++;
  }

  console.log('API stats:', stats);
})();

