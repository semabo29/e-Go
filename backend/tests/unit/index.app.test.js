const request = require('supertest');

const mockPoolQuery = jest.fn();
const mockCanReach = jest.fn();
const mockStartScheduler = jest.fn();

jest.mock('../../lib/scheduler', () => ({
  startScheduler: (...args) => mockStartScheduler(...args),
}));

jest.mock('../../services/rangeCalculationService', () => ({
  canReach: (...args) => mockCanReach(...args),
}));

jest.mock('../../lib/db', () => ({
  pool: {
    query: (...args) => mockPoolQuery(...args),
    end: jest.fn().mockResolvedValue(undefined),
  },
  USUARIOS_TABLE: '"ego"."usuari"',
  AMIGOS_TABLE: '"ego"."amics"',
  CONDUCTORES_TABLE: '"ego"."conductor"',
  ADMINS_TABLE: '"ego"."admins"',
  EMPRESAS_TABLE: '"ego"."empresas"',
  STATION_REQUESTS_TABLE: '"ego"."station_requests"',
  SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
  RESENYES_TABLE: '"ego"."resenyes"',
  CONDUCTOR_SKINS_TABLE: '"ego"."conductor_skins"',
  CARGAS_TABLE: '"ego"."charging_sessions"',
}));

function loadApp(extraEnv = {}) {
  let app;
  jest.isolateModules(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'index-test-secret';
    Object.assign(process.env, extraEnv);
    app = require('../../index.jsx');
  });
  return app;
}

describe('index.jsx app wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockResolvedValue({ rows: [{ now: '2026-05-20T12:00:00.000Z' }] });
    mockCanReach.mockResolvedValue({ canReach: true, batteryLeftKWh: 0.5 });
  });

  test('exporta app y handler serverless', () => {
    const app = loadApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.handler).toBe('function');
  });

  test('GET / health check con DB conectada', async () => {
    const app = loadApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.database).toBe('connected');
    expect(res.body.mensaje).toContain('e-Go API');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET / devuelve 500 si falla la consulta a la DB', async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error('db down'));
    const app = loadApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.details).toBe('DB Connection failed');
  });

  test('rutas desconocidas devuelven 404', async () => {
    const app = loadApp();
    const res = await request(app).get('/ruta-inexistente-index-test');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toContain('ruta-inexistente-index-test');
  });

  test('POST /auth/admin/local/login está montada', async () => {
    const app = loadApp();
    const res = await request(app).post('/auth/admin/local/login').send({});
    expect(res.status).not.toBe(404);
  });

  test('POST /auth/company/local/login está montada', async () => {
    const app = loadApp();
    const res = await request(app).post('/auth/company/local/login').send({});
    expect(res.status).not.toBe(404);
  });

  test('GET /can-reach devuelve 200 con resultado del servicio', async () => {
    const app = loadApp();
    const res = await request(app).get('/can-reach').query({
      startLat: 41.38,
      startLon: 2.17,
      endLat: 41.39,
      endLon: 2.18,
      vehicleType: 'bike',
      batteryKWh: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.canReach).toBe(true);
    expect(mockCanReach).toHaveBeenCalled();
  });

  test('GET /can-reach devuelve 400 en error de validación', async () => {
    mockCanReach.mockRejectedValueOnce({ type: 'VALIDATION_ERROR', message: 'Coordenadas inválidas.' });
    const app = loadApp();
    const res = await request(app).get('/can-reach').query({
      startLat: 1,
      startLon: 2,
      endLat: 3,
      endLon: 4,
      vehicleType: 'bike',
      batteryKWh: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Coordenadas inválidas.');
  });

  test('GET /can-reach devuelve 404 si no hay ruta', async () => {
    mockCanReach.mockRejectedValueOnce({ type: 'ROUTE_NOT_FOUND', message: 'Sin ruta' });
    const app = loadApp();
    const res = await request(app).get('/can-reach').query({
      startLat: 1,
      startLon: 2,
      endLat: 3,
      endLon: 4,
      vehicleType: 'car',
      batteryKWh: 10,
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sin ruta');
  });

  test('GET /can-reach devuelve 429 si se supera el límite', async () => {
    mockCanReach.mockRejectedValueOnce({ type: 'OVER_QUERY_LIMIT', message: 'Límite' });
    const app = loadApp();
    const res = await request(app).get('/can-reach').query({
      startLat: 1,
      startLon: 2,
      endLat: 3,
      endLon: 4,
      vehicleType: 'car',
      batteryKWh: 10,
    });
    expect(res.status).toBe(429);
  });

  test('GET /can-reach devuelve 500 en error genérico', async () => {
    mockCanReach.mockRejectedValueOnce(new Error('boom'));
    const app = loadApp();
    const res = await request(app).get('/can-reach').query({
      startLat: 1,
      startLon: 2,
      endLat: 3,
      endLon: 4,
      vehicleType: 'car',
      batteryKWh: 10,
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });

  test('API_PATH_PREFIX reescribe la URL antes del enrutado', async () => {
    const app = loadApp({ API_PATH_PREFIX: '/prod' });
    const res = await request(app).get('/prod/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  test('API_PATH_PREFIX conserva query string', async () => {
    const app = loadApp({ API_PATH_PREFIX: 'prod' });
    mockCanReach.mockResolvedValue({ canReach: false, batteryLeftKWh: 0 });
    const res = await request(app).get('/prod/can-reach').query({
      startLat: 1,
      startLon: 2,
      endLat: 3,
      endLon: 4,
      vehicleType: 'bike',
      batteryKWh: 1,
    });
    expect(res.status).toBe(200);
  });

  test('API_PATH_PREFIX acepta ruta exactamente igual al prefijo', async () => {
    const app = loadApp({ API_PATH_PREFIX: '/prod' });
    const res = await request(app).get('/prod');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });
});
