const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
const GOOGLE_GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function buildAddressParts(addressComponents = []) {
  const byType = new Map();
  for (const component of addressComponents) {
    const types = component?.types ?? [];
    for (const type of types) {
      if (!byType.has(type)) {
        byType.set(type, component.long_name);
      }
    }
  }

  const municipality =
    byType.get('locality') ||
    byType.get('postal_town') ||
    byType.get('administrative_area_level_3') ||
    null;
  const province = byType.get('administrative_area_level_2') || null;
  return { municipality, province };
}

function parseLatLng(location) {
  if (!location || typeof location !== 'object') return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function mapGeocodeResult(result) {
  const coords = parseLatLng(result?.geometry?.location);
  if (!coords) return null;

  const { municipality, province } = buildAddressParts(result.address_components);
  return {
    formattedAddress: result.formatted_address || '',
    lat: coords.lat,
    lng: coords.lng,
    municipi: municipality,
    provincia: province,
  };
}

function pickBestGeocodeSuggestion(results = []) {
  for (const result of results) {
    const mapped = mapGeocodeResult(result);
    if (mapped) return mapped;
  }
  return null;
}

async function callGeocode(params) {
  const url = new URL(GOOGLE_GEOCODE_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY || '');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Geocoding HTTP error ${response.status}`);
  }
  const data = await response.json();

  if (data.status === 'OVER_QUERY_LIMIT') {
    const err = new Error('Demasiadas solicitudes a la API de geocoding');
    err.type = 'OVER_QUERY_LIMIT';
    throw err;
  }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const err = new Error(
      data.error_message || `Google Geocoding: ${data.status}`
    );
    err.type = 'GOOGLE_GEOCODE_ERROR';
    err.googleStatus = data.status;
    throw err;
  }

  return data;
}

async function searchAddress(req, res) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        error:
          'Falta GOOGLE_MAPS_API_KEY (o GOOGLE_GEOCODING_API_KEY) en el servidor para geocoding',
      });
    }

    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json([]);
    }

    const data = await callGeocode({
      address: q,
      region: 'es',
      language: 'es',
    });
    const results = (data.results || []).map(mapGeocodeResult).filter(Boolean).slice(0, 5);
    return res.json(results);
  } catch (error) {
    if (error?.type === 'OVER_QUERY_LIMIT') {
      return res.status(429).json({ error: error.message });
    }
    if (error?.type === 'GOOGLE_GEOCODE_ERROR') {
      console.error('Google geocode search error:', error.message);
      return res.status(502).json({
        error:
          'Google Geocoding rechazo la peticion. Activa la API Geocoding en Google Cloud y revisa restricciones de la clave.',
        details: error.message,
      });
    }
    console.error('Error searching address:', error);
    return res.status(500).json({ error: 'No se pudo buscar la direccion' });
  }
}

async function reverseAddress(req, res) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        error:
          'Falta GOOGLE_MAPS_API_KEY (o GOOGLE_GEOCODING_API_KEY) en el servidor para geocoding',
      });
    }

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Latitud/longitud invalidas' });
    }

    const data = await callGeocode({
      latlng: `${lat},${lng}`,
      language: 'es',
    });
    const best = pickBestGeocodeSuggestion(data.results);
    return res.json(best);
  } catch (error) {
    if (error?.type === 'OVER_QUERY_LIMIT') {
      return res.status(429).json({ error: error.message });
    }
    if (error?.type === 'GOOGLE_GEOCODE_ERROR') {
      console.error('Google reverse geocode error:', error.message);
      return res.status(502).json({
        error:
          'Google Geocoding rechazo la peticion. Activa la API Geocoding en Google Cloud y revisa restricciones de la clave.',
        details: error.message,
      });
    }
    console.error('Error reverse geocoding:', error);
    return res.status(500).json({ error: 'No se pudo resolver la direccion' });
  }
}

module.exports = {
  searchAddress,
  reverseAddress,
};
