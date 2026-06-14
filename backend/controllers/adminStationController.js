const stationModel = require('../models/stationModel');
const {
  validateCreateStationInput,
  validateUpdateStationPatch,
} = require('../lib/manualStationPayload');

async function createManualStation(req, res) {
  try {
    const parsed = validateCreateStationInput(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const station = await stationModel.createManualStation({
      ...parsed.value,
      created_by_admin_id: req.admin.sub,
    });

    return res.status(201).json(station);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'external_id ya existe' });
    }
    console.error('Error creando estacion manual:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function updateManualStation(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }

    const parsed = validateUpdateStationPatch(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const station = await stationModel.updateManualStation(id, parsed.value);
    if (!station) {
      return res.status(404).json({ error: 'Estacion manual no encontrada' });
    }
    return res.json(station);
  } catch (err) {
    console.error('Error actualizando estacion manual:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function deleteManualStation(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    const deleted = await stationModel.deleteManualStation(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Estacion manual no encontrada' });
    }
    return res.json({ success: true, id: deleted.id });
  } catch (err) {
    console.error('Error borrando estacion manual:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  createManualStation,
  updateManualStation,
  deleteManualStation,
  listMyManualStations,
  listAllStations,
  setStationOperatiu,
};

async function listMyManualStations(req, res) {
  try {
    const stations = await stationModel.getManualStationsByAdmin(req.admin.sub);
    return res.json(stations);
  } catch (err) {
    console.error('Error listando estaciones manuales:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

const PAGE_SIZE = 50;

async function listAllStations(req, res) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = PAGE_SIZE + 1;

    const stations = await stationModel.getAllStationsForAdmin({ q, limit, offset });
    const hasMore = stations.length > PAGE_SIZE;
    return res.json({ stations: stations.slice(0, PAGE_SIZE), hasMore });
  } catch (err) {
    console.error('Error listando todas las estaciones:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function setStationOperatiu(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    const { operatiu } = req.body;
    if (typeof operatiu !== 'boolean') {
      return res.status(400).json({ error: 'El campo operatiu debe ser un booleano' });
    }
    const station = await stationModel.setStationOperatiu(id, operatiu);
    if (!station) {
      return res.status(404).json({ error: 'Estacion no encontrada' });
    }
    return res.json(station);
  } catch (err) {
    console.error('Error actualizando operatiu:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
}
