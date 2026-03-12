const stationService = require('../services/stationService');

/**
 * Función que inicia la sincronización automática de estaciones.
 */
async function syncStations() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando actualización automática de estaciones...`);
    const count = await stationService.syncStations();
    console.log(`[${new Date().toLocaleTimeString()}] Actualización completada: ${count} estaciones procesadas.`);
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Error en actualización automática:`, err.message);
  }
}

/**
 * Inicia el planificador (scheduler) para actualizar las estaciones automáticamente.
 * @param {number} intervalMs - Intervalo en milisegundos entre cada sincronización.
 */
function startScheduler(intervalMs = 5 * 60 * 1000) {
  // Sincronización inicial al arrancar el servidor
  syncStations();

  // Programar sincronizaciones siguientes
  setInterval(syncStations, intervalMs);

  console.log(`Scheduler iniciado: Actualizando cada ${intervalMs / 1000 / 60} minutos.`);
}

module.exports = { startScheduler };