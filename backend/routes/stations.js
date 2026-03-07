const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');
const axios = require('axios');

/**
 * GET /stations/sync
 * Sincroniza las estaciones usando la URL y el Token proporcionados por el usuario.
 */
router.get('/sync', async (req, res) => {
  try {
    const URL = 'https://analisi.transparenciacatalunya.cat/api/v3/views/tb2m-m33b/query.json';
    const APP_TOKEN = 'dFKvXVL6BBQ9QvmF30fVxc2Gk';

    console.log('--- Iniciando Sincronización ---');
    console.log('Solicitando datos a la API...');

    const response = await axios.get(URL, {
      headers: { 'X-App-Token': APP_TOKEN }
    });

    // Socrata v3 puede devolver el array directamente o dentro de un objeto 'results'
    let estaciones = response.data;
    if (!Array.isArray(estaciones) && estaciones.results) {
      estaciones = estaciones.results;
    }

    if (!Array.isArray(estaciones)) {
      console.error('ERROR: La API no devolvió un array. Respuesta recibida:', typeof response.data);
      return res.status(400).json({
        error: 'Formato de API inválido',
        recibido: typeof response.data
      });
    }

    console.log(`API entregó ${estaciones.length} registros.`);

    // Log del primer elemento para verificar nombres de campos en la consola
    if (estaciones.length > 0) {
      console.log('Ejemplo de datos recibidos (primer objeto):', JSON.stringify(estaciones[0], null, 2));
    }

    const query = `
      INSERT INTO estaciones (
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

    let insertados = 0;
    let errores = 0;

    for (const est of estaciones) {
      try {
        // Verificamos que existan coordenadas mínimas
        if (!est.latitud || !est.longitud) {
          continue;
        }

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
        insertados++;
      } catch (err) {
        errores++;
        if (errores <= 5) {
            console.error(`Error en registro ${est[':id'] || 'sin-id'}:`, err.message);
        }
      }
    }

    console.log(`Sincronización finalizada. Éxito: ${insertados}, Errores: ${errores}`);
    console.log('--- Fin Sincronización ---');

    res.json({
      success: true,
      mensaje: 'Sincronización procesada',
      total_en_api: estaciones.length,
      guardados_en_db: insertados,
      fallidos: errores
    });

  } catch (error) {
    console.error('Error crítico en /sync:', error.message);
    res.status(500).json({ error: 'Error al sincronizar con la API externa' });
  }
});

/**
 * GET /stations
 * Devuelve todas las estaciones de la BD local.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estaciones ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener estaciones:', err);
    res.status(500).json({ error: 'Error al obtener estaciones de la BD' });
  }
});

module.exports = router;
