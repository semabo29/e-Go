const request = require('supertest');

describe('Geocode routes', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;
  let app;

  // sin API key, error de configuración.
  beforeAll(() => {
    process.env.GOOGLE_MAPS_API_KEY = ' ';
    jest.isolateModules(() => {
      app = require('../index.jsx');
    });
  });

  afterAll(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // menos de 3 caracteres útiles no se llama a Google: debe devolver lista vacía.
  test('GET /geocode/autocomplete devuelve [] si input corto', async () => {
    const res = await request(app).get('/geocode/autocomplete?input=ab');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // simula respuesta OK de Autocomplete:
  test('GET /geocode/autocomplete proxifica Places y devuelve predicciones', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'pid1',
            description: 'Carrer Test 1, Barcelona',
            structured_formatting: {
              main_text: 'Carrer Test 1',
              secondary_text: 'Barcelona, España',
            },
          },
        ],
      }),
    });

    const res = await request(app).get('/geocode/autocomplete?input=Carrer%20Tes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        placeId: 'pid1',
        label: 'Carrer Test 1',
        subtitle: 'Barcelona, España',
        description: 'Carrer Test 1, Barcelona',
      },
    ]);
    expect(global.fetch).toHaveBeenCalled();
  });

  // extrae coordenadas y dirección formateada.
  test('GET /geocode/place devuelve lat/lng', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: {
          formatted_address: 'Carrer X, 08001 Barcelona',
          geometry: { location: { lat: 41.39, lng: 2.17 } },
        },
      }),
    });

    const res = await request(app).get('/geocode/place?placeId=pid1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      lat: 41.39,
      lng: 2.17,
      formattedAddress: 'Carrer X, 08001 Barcelona',
    });
  });

  // sin `placeId`, error de validación.
  test('GET /geocode/place sin placeId devuelve 400', async () => {
    const res = await request(app).get('/geocode/place');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  // Google responde error: error de Google.
  test('GET /geocode/autocomplete devuelve 502 si Google responde error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'REQUEST_DENIED',
        error_message: 'no access',
      }),
    });

    const res = await request(app).get('/geocode/autocomplete?input=Barcelona');
    expect(res.status).toBe(502);
    expect(res.body.error).toBeTruthy();
  });
});
