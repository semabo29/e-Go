const request = require('supertest');

describe('Geocode routes', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;
  let app;

  // Clau no buida (espai) para que dotenv no bloquee los happy path; CONFIG se prueba vaciando la env en cada test.
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

  // Tras trim en servicio/controlador, espacios no cuentan como búsqueda válida.
  test('GET /geocode/autocomplete devuelve [] si input solo espacios', async () => {
    const res = await request(app).get('/geocode/autocomplete?input=%20%20');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Place Details con status distinto de OK → GOOGLE_ERROR en servicio → 502 en controlador.
  test('GET /geocode/place devuelve 502 si Google responde error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'INVALID_REQUEST',
        error_message: 'bad place',
      }),
    });

    const res = await request(app).get('/geocode/place?placeId=pid1');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/ubicació/i);
  });

  // placeId solo espacios: el controlador responde 400 antes de llamar a Google.
  test('GET /geocode/place sin placeId util devuelve 400', async () => {
    const res = await request(app).get('/geocode/place?placeId=%20%20');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('placeId és obligatori');
  });

  // Vaciamos la env en runtime (dotenv ya cargó .env al arrancar la app).
  test('GET /geocode/autocomplete devuelve 503 si falta API key', async () => {
    const saved = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = '';
    try {
      const res = await request(app).get('/geocode/autocomplete?input=Barcelona');
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/configuració/i);
    } finally {
      process.env.GOOGLE_MAPS_API_KEY = saved;
    }
  });

  // Misma comprobación CONFIG que autocomplete, ruta /place.
  test('GET /geocode/place devuelve 503 si falta API key', async () => {
    const saved = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = '';
    try {
      const res = await request(app).get('/geocode/place?placeId=pid1');
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/configuració/i);
    } finally {
      process.env.GOOGLE_MAPS_API_KEY = saved;
    }
  });
});
