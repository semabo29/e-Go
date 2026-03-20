const stationModel = require('../models/stationModel');

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

async function createManualStation(req, res) {
  try {
    const {
      external_id,
      promotor,
      acces,
      tipus_velocitat,
      tipus_connexio,
      latitud,
      longitud,
      nom,
      kw,
      ac_dc,
      adreca,
      municipi,
      provincia,
    } = req.body || {};

    const lat = parseNumber(latitud);
    const lng = parseNumber(longitud);
    const power = parseNumber(kw) ?? 0;

    if (!nom || typeof nom !== 'string') {
      return res.status(400).json({ error: 'Falta el nombre de la estacion' });
    }
    if (lat === null || lng === null) {
      return res.status(400).json({ error: 'Latitud y longitud son obligatorias y numericas' });
    }

    const station = await stationModel.createManualStation({
      external_id,
      promotor,
      acces,
      tipus_velocitat,
      tipus_connexio,
      latitud: lat,
      longitud: lng,
      nom: nom.trim(),
      kw: power,
      ac_dc,
      adreca,
      municipi,
      provincia,
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

    const patch = {};
    const body = req.body || {};

    if (body.external_id !== undefined) patch.external_id = body.external_id || null;
    if (body.promotor !== undefined) patch.promotor = body.promotor || null;
    if (body.acces !== undefined) patch.acces = body.acces || null;
    if (body.tipus_velocitat !== undefined) patch.tipus_velocitat = body.tipus_velocitat || null;
    if (body.tipus_connexio !== undefined) patch.tipus_connexio = body.tipus_connexio || null;
    if (body.nom !== undefined) patch.nom = body.nom ? body.nom.trim() : null;
    if (body.ac_dc !== undefined) patch.ac_dc = body.ac_dc || null;
    if (body.adreca !== undefined) patch.adreca = body.adreca || null;
    if (body.municipi !== undefined) patch.municipi = body.municipi || null;
    if (body.provincia !== undefined) patch.provincia = body.provincia || null;

    if (body.latitud !== undefined) {
      const lat = parseNumber(body.latitud);
      if (lat === null) return res.status(400).json({ error: 'Latitud invalida' });
      patch.latitud = lat;
    }
    if (body.longitud !== undefined) {
      const lng = parseNumber(body.longitud);
      if (lng === null) return res.status(400).json({ error: 'Longitud invalida' });
      patch.longitud = lng;
    }
    if (body.kw !== undefined) {
      const power = parseNumber(body.kw);
      if (power === null) return res.status(400).json({ error: 'kw invalido' });
      patch.kw = power;
    }

    const station = await stationModel.updateManualStation(id, patch);
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
