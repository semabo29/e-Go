const geocodeService = require('../services/geocodeService');

describe('geocodeService', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  // Con menos de 3 caracteres útiles no se llama a Google: debe devolver lista vacía.
  test('autocompleteAddress devuelve [] si input corto', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    await expect(geocodeService.autocompleteAddress('  ab ')).resolves.toEqual([]);
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

  // Place Details necesita `place_id`, si no, error de validación.
  test('placeDetails lanza VALIDATION sin placeId', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    await expect(geocodeService.placeDetails('')).rejects.toMatchObject({ code: 'VALIDATION' });
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
