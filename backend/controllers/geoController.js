const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
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

function mapGeocodeResult(result) {
  const location = result?.geometry?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  const { municipality, province } = buildAddressParts(result.address_components);
  return {
    formattedAddress: result.formatted_address || '',
    lat: location.lat,
    lng: location.lng,
    municipi: municipality,
    provincia: province,
  };
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
    throw new Error(`Google Geocoding API error: ${data.status}`);
  }

  return data;
}

async function searchAddress(req, res) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY no configurada' });
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
    console.error('Error searching address:', error);
    return res.status(500).json({ error: 'No se pudo buscar la direccion' });
  }
}

async function reverseAddress(req, res) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY no configurada' });
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
    const best = mapGeocodeResult(data.results?.[0]);
    return res.json(best);
  } catch (error) {
    if (error?.type === 'OVER_QUERY_LIMIT') {
      return res.status(429).json({ error: error.message });
    }
    console.error('Error reverse geocoding:', error);
    return res.status(500).json({ error: 'No se pudo resolver la direccion' });
  }
}

module.exports = {
  searchAddress,
  reverseAddress,
};
