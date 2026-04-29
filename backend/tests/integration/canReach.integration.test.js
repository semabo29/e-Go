const request = require('supertest');
const app = require('../../index.jsx');

// Run only when DB/integration mode is explicitly enabled.
const describeDb = process.env.RUN_DB_INTEGRATION === 'true' ? describe : describe.skip;
const testWithGoogleApi = process.env.GOOGLE_MAPS_API_KEY ? test : test.skip;
const originalFetch = global.fetch;

describeDb('canReach integration', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  testWithGoogleApi('GET /can-reach returns 200 for valid input', async () => {
    // Datos válidos devuelven 200 y un payload con tipos esperados.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'bike',
      batteryKWh: 1,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.canReach).toBe('boolean');
    expect(typeof res.body.batteryLeftKWh).toBe('number');
  });

  test('GET /can-reach returns 400 for invalid vehicle type', async () => {
    // vehicleType incorrecto devuelve 400 y mensaje exacto.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'plane',
      batteryKWh: 10,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Tipo de vehículo inválido.');
  });

  test('GET /can-reach returns 400 for invalid start coordinates', async () => {
    // coordenadas de inicio con formato inválido devuelve 400.
    const res = await request(app).get('/can-reach').query({
      startLat: 'invalid',
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'bike',
      batteryKWh: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Coordenadas de inicio inválidas.');
  });

  test('GET /can-reach returns 400 for invalid battery', async () => {
    // batería negativa devuelve 400.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'car',
      batteryKWh: -1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Batería inválida.');
  });

  test('GET /can-reach returns 404 when no route is available', async () => {
    // Simula ZERO_RESULTS de Google y devuelve 404.
    global.fetch = jest.fn(async () => ({
      json: async () => ({ status: 'ZERO_RESULTS' }),
    }));

    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'bike',
      batteryKWh: 1,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No hay una ruta disponible entre los puntos de origen y destino');
  });

  test('GET /can-reach returns 429 when Google quota limit is reached', async () => {
    // Simula OVER_QUERY_LIMIT de Google y devuelve 429.
    global.fetch = jest.fn(async () => ({
      json: async () => ({ status: 'OVER_QUERY_LIMIT' }),
    }));

    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'car',
      batteryKWh: 20,
    });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Demasiadas solicitudes a la API. Intenta de nuevo más tarde.');
  });

  test('GET /can-reach returns 500 for unexpected provider errors', async () => {
    // Simula REQUEST_DENIED de Google y devuelve 500.
    global.fetch = jest.fn(async () => ({
      json: async () => ({ status: 'REQUEST_DENIED' }),
    }));

    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'car',
      batteryKWh: 20,
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });

  test('GET /can-reach returns 400 when batteryKWh is missing', async () => {
    // si falta batteryKWh devuelve 400.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'car',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Batería inválida.');
  });

  test('GET /can-reach returns 400 when startLon is missing', async () => {
    // si falta startLon devuelve 400.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'bike',
      batteryKWh: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Coordenadas de inicio inválidas.');
  });

  test('GET /can-reach returns 400 when vehicleType is missing', async () => {
    // si falta vehicleType devuelve 400.
    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      batteryKWh: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Tipo de vehículo inválido.');
  });

  test('GET /can-reach returns 500 when provider fetch throws', async () => {
    // Simula fallo de red y devuelve 500.
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    });

    const res = await request(app).get('/can-reach').query({
      startLat: 41.3851,
      startLon: 2.1734,
      endLat: 41.3871,
      endLon: 2.1774,
      vehicleType: 'car',
      batteryKWh: 20,
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });
});
