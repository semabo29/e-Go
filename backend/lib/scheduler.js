const axios = require('axios');
const { pool } = require('./db');

/**
 * Función que realiza la sincronización de estaciones.
 * Reutiliza la lógica de la ruta pero automatizada.
 */
async function syncStations() {
  const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';
  const APP_TOKEN = 'dFKvXVL6BBQ9QvmF30fVxc2Gk';

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando actualización automática de estaciones...`);

    const response = await axios.get(URL, {
      headers: { 'X-App-Token': APP_TOKEN }
    });

    let estaciones = response.data;
    if (!Array.isArray(estaciones) && estaciones.results) {
      estaciones = estaciones.results;
    }

    if (!Array.isArray(estaciones)) {
      throw new Error('Formato de API inválido');
    }

    const query = `
      INSERT INTO ego.estaciones (
        external_id, promotor, acces, tipus_velocitat, tipus_connexio,
        latitud, longitud, nom, kw, ac_dc, adreca, municipi, provincia
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (external_id) DO UPDATE SET
        promotor = EXCLUDED.promotor,
        acces = EXCLUDED.acces,
        tipus_velocitat = EXCLUDED.tipus_velocitat,
        tipus_connexio = EXCLUDED.tipus_connexio,
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud,
        nom = EXCLUDED.nom,
        kw = EXCLUDED.kw,
        ac_dc = EXCLUDED.ac_dc,
        adreca = EXCLUDED.adreca,
        municipi = EXCLUDED.municipi,
        provincia = EXCLUDED.provincia,
        updated_at = NOW();
    `;

    let count = 0;
    for (const est of estaciones) {
      try {
        if (!est.latitud || !est.longitud) continue;

        await pool.query(query, [
          est[':id'] || est.id,
          est.promotor_gestor,
          est.acces,
          est.tipus_velocitat,
          est.tipus_connexi || est.tipus_connexio,
          parseFloat(est.latitud),
          parseFloat(est.longitud),
          est.designaci_descriptiva,
          parseFloat(est.kw) || 0,
          est.ac_dc,
          est.adre_a || est.adreca,
          est.municipi,
          est.provincia
        ]);
        count++;
      } catch (err) {
        // Silencioso para no saturar logs del scheduler
      }
    }

    console.log(`[${new Date().toLocaleTimeString()}] Actualización completada: ${count} estaciones procesadas.`);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Error en la actualización automática:`, error.message);
  }
}

/**
 * Inicia el planificador (scheduler).
 * @param {number} intervalMs - Intervalo en milisegundos.
 */
function startScheduler(intervalMs = 5 * 60 * 1000) {
  // Realizar una sincronización inicial al arrancar el servidor
  syncStations();

  // Programar las siguientes cada X tiempo
  setInterval(syncStations, intervalMs);

  console.log(`Scheduler iniciado: Actualizando cada ${intervalMs / 1000 / 60} minutos.`);
}

module.exports = { startScheduler };
