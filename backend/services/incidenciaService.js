const { pool } = require('../lib/db');
const incidenciaModel = require('../models/incidenciaModel');
const userPointsModel = require('../models/userPointsModel');
const subscriptionModel = require('../models/subscriptionModel');
const { uploadFile, getPublicUrl } = require('../lib/s3Service');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const INCIDENCIA_POINTS = 10;
const PREMIUM_MULTIPLIER = 2;
const AUTO_TRIGGER_THRESHOLD = 5;
const INCIDENCIA_ALREADY_REPORTED_MESSAGE =
  'Ya has reportado esta incidencia para esta estación';

async function listIncidenciaTypes() {
  return incidenciaModel.getIncidenciaTypes();
}

/**
 * Calcula y otorga puntos al conductor según si es premium o no.
 * Retorna { points, isPremium } para trazabilidad en respuestas.
 */
async function awardValidationPoints(conductorId) {
  const subscription = await subscriptionModel.findByUserId(conductorId);
  const isPremium = subscription?.status === 'active';
  const points = isPremium ? INCIDENCIA_POINTS * PREMIUM_MULTIPLIER : INCIDENCIA_POINTS;
  await userPointsModel.addPoints(conductorId, points);
  return { points, isPremium };
}

/**
 * Comprueba si se alcanza el umbral de 5 conductores distintos con reportes
 * pendientes del mismo tipo en la misma estación. Si se cumple, valida todas
 * las incidencias pendientes en lote y otorga puntos. Si el tipo es 'Operatiu',
 * también las marca resueltas y pone la estación como operativa.
 * Debe ejecutarse dentro de una transacción (client ya iniciado con BEGIN).
 */
async function checkAndApplyAutoTriggers(client, estacioId, tipus) {
  const count = await incidenciaModel.countDistinctPendingReporters(client, estacioId, tipus);
  if (count < AUTO_TRIGGER_THRESHOLD) return;

  const pending = await incidenciaModel.listPendingByStationAndType(client, estacioId, tipus);

  for (const inc of pending) {
    const result = await incidenciaModel.validateIncidencia(client, inc.id, null);
    if (!result) continue;
    // awardPoints siempre es true en validateIncidencia cuando la fila existe
    await awardValidationPoints(inc.conductor);

    if (tipus === 'Operatiu') {
      await incidenciaModel.resolveIncidencia(client, inc.id, null);
    }
  }

  if (tipus === 'Operatiu') {
    await incidenciaModel.setStationOperatiu(client, estacioId, true);
  }
}

async function createIncidencia(data, file) {
  const conductor = Number(data.conductor);
  const estacio = Number(data.estacio);
  const comentari = String(data.comentari || '').trim();
  const tipus = String(data.tipus || '').trim();

  if (!comentari) {
    const error = new Error('El comentario es obligatorio');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!tipus) {
    const error = new Error('El tipo es obligatorio');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!Number.isInteger(conductor) || conductor <= 0) {
    const error = new Error('Conductor no válido');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!Number.isInteger(estacio) || estacio <= 0) {
    const error = new Error('Estación no válida');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const types = await incidenciaModel.getIncidenciaTypes();
  if (!types.includes(tipus)) {
    const error = new Error('El tipo seleccionado no es válido');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const [hasConductor, hasStation] = await Promise.all([
    incidenciaModel.conductorExists(conductor),
    incidenciaModel.stationExists(estacio),
  ]);

  if (!hasConductor) {
    const error = new Error('El conductor no existe');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!hasStation) {
    const error = new Error('La estación no existe');
    error.code = 'NOT_FOUND';
    throw error;
  }

  let arxiu = null;
  if (file) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Solo se permiten imágenes JPG, PNG o WEBP');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const uploadedKey = await uploadFile(file.buffer, file.originalname, file.mimetype);
    arxiu = getPublicUrl(uploadedKey);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hasOpen = await incidenciaModel.hasOpenIncidenciaForConductorAndStation(
      conductor,
      estacio,
      tipus,
      client
    );
    if (hasOpen) {
      const error = new Error(INCIDENCIA_ALREADY_REPORTED_MESSAGE);
      error.code = 'CONFLICT';
      throw error;
    }

    const incidencia = await incidenciaModel.createIncidencia(
      { tipus, comentari, arxiu, conductor, estacio },
      client
    );

    await checkAndApplyAutoTriggers(client, estacio, tipus);

    await client.query('COMMIT');
    return incidencia;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const conflict = new Error(INCIDENCIA_ALREADY_REPORTED_MESSAGE);
      conflict.code = 'CONFLICT';
      throw conflict;
    }
    throw err;
  } finally {
    client.release();
  }
}

// --- Acciones admin ---

async function adminListPending() {
  return incidenciaModel.listPending();
}

async function adminListHistory(filters) {
  return incidenciaModel.listHistory(filters);
}

async function adminGetById(id) {
  const inc = await incidenciaModel.getById(id);
  if (!inc) {
    const error = new Error('Incidencia no encontrada');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return inc;
}

async function adminValidate(adminId, incidenciaId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await incidenciaModel.validateIncidencia(client, incidenciaId, adminId);
    if (!result) {
      const error = new Error('Incidencia no encontrada o ya procesada (validada/rechazada)');
      error.code = 'CONFLICT';
      throw error;
    }

    let pointsResult = null;
    if (result.awardPoints) {
      pointsResult = await awardValidationPoints(result.incidencia.conductor);
    }

    await client.query('COMMIT');
    return { incidencia: result.incidencia, pointsAwarded: pointsResult };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function adminReject(adminId, incidenciaId, motiu) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const incidencia = await incidenciaModel.rejectIncidencia(client, incidenciaId, adminId, motiu);
    if (!incidencia) {
      const error = new Error('Incidencia no encontrada o ya está validada/resuelta/rechazada');
      error.code = 'CONFLICT';
      throw error;
    }

    await client.query('COMMIT');
    return incidencia;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function adminResolve(adminId, incidenciaId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const incidencia = await incidenciaModel.resolveIncidencia(client, incidenciaId, adminId);
    if (!incidencia) {
      const error = new Error('Incidencia no encontrada o no está validada (debe validarse antes de resolver)');
      error.code = 'CONFLICT';
      throw error;
    }

    if (incidencia.tipus === 'Operatiu') {
      await incidenciaModel.setStationOperatiu(client, incidencia.estacio, true);
    }

    await client.query('COMMIT');
    return incidencia;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listIncidenciaTypes,
  createIncidencia,
  adminListPending,
  adminListHistory,
  adminGetById,
  adminValidate,
  adminReject,
  adminResolve,
};
