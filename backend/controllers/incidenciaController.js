const incidenciaService = require('../services/incidenciaService');

async function getTypes(req, res) {
  try {
    const types = await incidenciaService.listIncidenciaTypes();
    return res.json(types);
  } catch (error) {
    console.error('Error listando tipos de incidencia:', error);
    return res.status(500).json({ error: 'Error obteniendo tipos de incidencia' });
  }
}

async function create(req, res) {
  try {
    const incidencia = await incidenciaService.createIncidencia(req.body, req.file);
    return res.status(201).json(incidencia);
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === 'CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creando incidencia:', error);
    return res.status(500).json({ error: 'Error creando incidencia' });
  }
}

module.exports = {
  getTypes,
  create,
};
