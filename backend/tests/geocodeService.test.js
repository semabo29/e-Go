const geocodeService = require('../services/geocodeService');

// Tests unitarios del servicio: mock de fetch para no depender de la API real de Google.
describe('geocodeService', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  // Menos de 3 caracteres útiles (o null tras trim) no llama a Google: lista vacía.
  test('autocompleteAddress devuelve [] si input corto', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    await expect(geocodeService.autocompleteAddress('  ab ')).resolves.toEqual([]);
    await expect(geocodeService.autocompleteAddress(null)).resolves.toEqual([]);
  });

  // Google responde OK pero sin array predictions → lista vacía (no error).
  test('autocompleteAddress devuelve [] si OK sin predicciones', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'OK' }),
    });
    await expect(geocodeService.autocompleteAddress('addr')).resolves.toEqual([]);
  });

  // Sin `GOOGLE_MAPS_API_KEY` el servicio no puede autenticar la petición: error de configuración.
  test('autocompleteAddress lanza CONFIG sin API key', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    await expect(geocodeService.autocompleteAddress('Barcelona')).rejects.toMatchObject({
      code: 'CONFIG',
    });
  });

  // Simula respuesta OK de Autocomplete: comprueba el mapeo a `placeId`, `label`, etc.
  test('autocompleteAddress mapea predicciones OK', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'abc',
            description: 'Full desc',
            structured_formatting: { main_text: 'Main', secondary_text: 'Sub' },
          },
        ],
      }),
    });
    const out = await geocodeService.autocompleteAddress('Main str');
    expect(out).toEqual([
      {
        placeId: 'abc',
        label: 'Main',
        subtitle: 'Sub',
        description: 'Full desc',
      },
    ]);
  });

  // status ZERO_RESULTS se trata como “sin coincidencias”, no como fallo.
  test('autocompleteAddress devuelve [] en ZERO_RESULTS', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'ZERO_RESULTS' }),
    });
    await expect(geocodeService.autocompleteAddress('zzz')).resolves.toEqual([]);
  });

  // status distinto de OK/ZERO_RESULTS → excepción con code GOOGLE_ERROR y googleStatus.
  test('autocompleteAddress lanza GOOGLE_ERROR si Google responde error', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'REQUEST_DENIED',
        error_message: 'denied',
      }),
    });
    await expect(geocodeService.autocompleteAddress('Barcelona')).rejects.toMatchObject({
      code: 'GOOGLE_ERROR',
      googleStatus: 'REQUEST_DENIED',
      message: 'denied',
    });
  });

  // Sin error_message en la respuesta, el mensaje se construye como `Places: {status}`.
  test('autocompleteAddress usa mensaje por defecto si Google no envía error_message', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'OVER_QUERY_LIMIT' }),
    });
    await expect(geocodeService.autocompleteAddress('Barcelona')).rejects.toMatchObject({
      code: 'GOOGLE_ERROR',
      message: 'Places: OVER_QUERY_LIMIT',
    });
  });

  // Fallback de label/subtitle cuando la predicción no trae structured_formatting.
  test('autocompleteAddress usa description si falta structured_formatting', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        predictions: [{ place_id: 'x', description: 'Solo desc' }],
      }),
    });
    const out = await geocodeService.autocompleteAddress('addr');
    expect(out).toEqual([
      {
        placeId: 'x',
        label: 'Solo desc',
        subtitle: '',
        description: 'Solo desc',
      },
    ]);
  });

  // opts.language y opts.region se pasan a los query params de la petición a Places.
  test('autocompleteAddress respeta language y region en la URL', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'OK', predictions: [] }),
    });
    await geocodeService.autocompleteAddress('addr', { language: 'en', region: 'fr' });
    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('language=en');
    expect(calledUrl).toContain('country%3Afr');
  });

  // place_id no vacío tras trim; si no, code VALIDATION.
  test('placeDetails lanza VALIDATION sin placeId', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    await expect(geocodeService.placeDetails('')).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(geocodeService.placeDetails('   ')).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  // exige GOOGLE_MAPS_API_KEY antes de llamar a Google.
  test('placeDetails lanza CONFIG sin API key', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    await expect(geocodeService.placeDetails('pid')).rejects.toMatchObject({
      code: 'CONFIG',
      message: 'Google Maps API key no configurada',
    });
  });

  // INVALID_REQUEST.
  test('placeDetails lanza GOOGLE_ERROR si status no es OK', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'INVALID_REQUEST',
        error_message: 'bad place',
      }),
    });
    await expect(geocodeService.placeDetails('pid')).rejects.toMatchObject({
      code: 'GOOGLE_ERROR',
      googleStatus: 'INVALID_REQUEST',
      message: 'bad place',
    });
  });

  // mensaje `Place details: {status}` si falta error_message.
  test('placeDetails usa mensaje por defecto si Google no envía error_message', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'NOT_FOUND' }),
    });
    await expect(geocodeService.placeDetails('pid')).rejects.toMatchObject({
      code: 'GOOGLE_ERROR',
      message: 'Place details: NOT_FOUND',
    });
  });

  // status OK pero sin geometry.location.
  test('placeDetails lanza GOOGLE_ERROR si falta geometry', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: { formatted_address: 'Addr' },
      }),
    });
    await expect(geocodeService.placeDetails('pid')).rejects.toMatchObject({
      code: 'GOOGLE_ERROR',
      googleStatus: 'OK',
    });
  });

  // formatted_address y name ausentes.
  test('placeDetails devuelve formattedAddress vacío si no hay dirección ni name', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: { geometry: { location: { lat: 1, lng: 2 } } },
      }),
    });
    await expect(geocodeService.placeDetails('pid')).resolves.toEqual({
      lat: 1,
      lng: 2,
      formattedAddress: '',
    });
  });

  // name cuando Google no devuelve formatted_address.
  test('placeDetails usa name si no hay formatted_address', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: {
          name: 'Nom lloc',
          geometry: { location: { lat: 3, lng: 4 } },
        },
      }),
    });
    await expect(geocodeService.placeDetails('pid')).resolves.toEqual({
      lat: 3,
      lng: 4,
      formattedAddress: 'Nom lloc',
    });
  });

  // extrae coordenadas y dirección formateada.
  test('placeDetails devuelve lat/lng y dirección formateada', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: {
          formatted_address: 'Addr',
          geometry: { location: { lat: 1, lng: 2 } },
        },
      }),
    });
    await expect(geocodeService.placeDetails('pid')).resolves.toEqual({
      lat: 1,
      lng: 2,
      formattedAddress: 'Addr',
    });
  });
});
