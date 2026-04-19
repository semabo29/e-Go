/**
 * Encuentra registros del dataset con lat/lon válidos cuyo est.id
 * no sea numérico (por regex) o no exista.
 *
 * Uso: node scripts/find-non-numeric-id.js
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.APP_TOKEN;
const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';

function isNumericString(v) {
  return typeof v === 'string' && /^[0-9]+$/.test(v);
}

(async () => {
  if (!TOKEN) {
    console.error('Falta APP_TOKEN');
    process.exit(1);
  }

  const response = await axios.get(URL, {
    headers: { 'X-App-Token': TOKEN },
  });

  let estaciones = response.data;
  if (!Array.isArray(estaciones) && estaciones.results) estaciones = estaciones.results;
  if (!Array.isArray(estaciones)) throw new Error('Formato de API inválido');

  const valid = estaciones.filter((est) => est && est.latitud && est.longitud);
  const bad = valid.filter((est) => !isNumericString(String(est.id)));

  console.log('valid:', valid.length);
  console.log('bad id count:', bad.length);
  console.log('sample bad ids:', bad.slice(0, 5).map((est) => ({ id: est.id, colonId: est[':id'] })) );
})();

