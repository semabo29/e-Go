function mapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

/**
 * Prediccions d'autocompletat (Places). La clau va al servidor, no a l'app.
 * @param {string} input
 * @param {{ language?: string, region?: string }} [opts]
 */
async function autocompleteAddress(input, opts = {}) {
  const key = mapsApiKey();
  if (!key) {
    const err = new Error('Google Maps API key no configurada');
    err.code = 'CONFIG';
    throw err;
  }
  const trimmed = String(input || '').trim();
  if (trimmed.length < 3) return [];

  const language = opts.language || 'ca';
  const region = opts.region || 'es';

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', trimmed);
  url.searchParams.set('key', key);
  url.searchParams.set('language', language);
  url.searchParams.set('components', `country:${region}`);

  const res = await fetch(url.href);
  const data = await res.json();

  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    const err = new Error(data.error_message || `Places: ${data.status}`);
    err.code = 'GOOGLE_ERROR';
    err.googleStatus = data.status;
    throw err;
  }

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    label: p.structured_formatting?.main_text || p.description,
    subtitle: p.structured_formatting?.secondary_text || '',
    description: p.description,
  }));
}

/**
 * Coordenades i adreça formatada per place_id
 * @param {string} placeId
 */
async function placeDetails(placeId) {
  const key = mapsApiKey();
  if (!key) {
    const err = new Error('Google Maps API key no configurada');
    err.code = 'CONFIG';
    throw err;
  }
  const id = String(placeId || '').trim();
  if (!id) {
    const err = new Error('placeId obligatori');
    err.code = 'VALIDATION';
    throw err;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', id);
  url.searchParams.set('fields', 'geometry/location,formatted_address,name');
  url.searchParams.set('key', key);
  url.searchParams.set('language', 'ca');

  const res = await fetch(url.href);
  const data = await res.json();

  if (data.status !== 'OK' || !data.result?.geometry?.location) {
    const err = new Error(data.error_message || `Place details: ${data.status}`);
    err.code = 'GOOGLE_ERROR';
    err.googleStatus = data.status;
    throw err;
  }

  const loc = data.result.geometry.location;
  return {
    lat: loc.lat,
    lng: loc.lng,
    formattedAddress: data.result.formatted_address || data.result.name || '',
  };
}

module.exports = {
  autocompleteAddress,
  placeDetails,
};
