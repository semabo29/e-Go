const incidenciaModel = require('../models/incidenciaModel');
const { uploadFile, getPublicUrl } = require('../lib/s3Service');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

async function listIncidenciaTypes() {
  return incidenciaModel.getIncidenciaTypes();
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

  return incidenciaModel.createIncidencia({
    tipus,
    comentari,
    arxiu,
    conductor,
    estacio,
  });
}

module.exports = {
  listIncidenciaTypes,
  createIncidencia,
};
