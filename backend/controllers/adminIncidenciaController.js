const incidenciaService = require('../services/incidenciaService');

async function listPending(req, res) {
  try {
    const incidencias = await incidenciaService.adminListPending();
    return res.json({ incidencias });
  } catch (err) {
    console.error('Error listando incidencias pendientes:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function listHistory(req, res) {
  try {
    const { from, to, tipus, estado, limit, offset } = req.query;
    const incidencias = await incidenciaService.adminListHistory({
      from: from || null,
      to: to || null,
      tipus: tipus || null,
      estado: estado || null,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      offset: offset ? Number(offset) : 0,
    });
    return res.json({ incidencias });
  } catch (err) {
    console.error('Error listando histórico de incidencias:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function getById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const incidencia = await incidenciaService.adminGetById(id);
    return res.json({ incidencia });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error obteniendo incidencia:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function validate(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const result = await incidenciaService.adminValidate(req.admin.sub, id);
    return res.json(result);
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error validando incidencia:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function reject(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const motiu = req.body?.motiu || null;
    const incidencia = await incidenciaService.adminReject(req.admin.sub, id, motiu);
    return res.json({ incidencia });
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error rechazando incidencia:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function resolve(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const incidencia = await incidenciaService.adminResolve(req.admin.sub, id);
    return res.json({ incidencia });
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error resolviendo incidencia:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  listPending,
  listHistory,
  getById,
  validate,
  reject,
  resolve,
};
