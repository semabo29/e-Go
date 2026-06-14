const request = require('supertest');
const express = require('express');

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
}));

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  USUARIOS_TABLE: '"ego"."usuari"',
  ADMINS_TABLE: '"ego"."admins"',
  EMPRESAS_TABLE: '"ego"."empresas"',
}));

const { getGooglePayload } = require('../../lib/authHelpers');
const { pool } = require('../../lib/db');
const authRouter = require('../../routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('routes/auth admin & company Google', () => {
  const app = buildApp();
  const jwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'jwt_test_secret';
  });

  afterAll(() => {
    if (jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtSecret;
  });

  test('POST /auth/admin/google 400 sin idToken ni code', async () => {
    const res = await request(app).post('/auth/admin/google').send({});
    expect(res.status).toBe(400);
  });

  test('POST /auth/admin/google 401 si Google no valida', async () => {
    getGooglePayload.mockResolvedValue(null);
    const res = await request(app).post('/auth/admin/google').send({ idToken: 'x' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/admin/google 403 si no hay fila admin', async () => {
    getGooglePayload.mockResolvedValue({ email: 'u@test.com' });
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/auth/admin/google').send({ idToken: 'x' });
    expect(res.status).toBe(403);
  });

  test('POST /auth/admin/google 200 con admin y JWT', async () => {
    getGooglePayload.mockResolvedValue({ email: 'admin@test.com' });
    pool.query.mockResolvedValue({
      rows: [{ id: 1, user_id: 2, email: 'admin@test.com', username: 'a', admin_since: new Date() }],
    });
    const res = await request(app).post('/auth/admin/google').send({ idToken: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.admin).toBeTruthy();
  });

  test('POST /auth/admin/google 500 si pool lanza', async () => {
    getGooglePayload.mockResolvedValue({ email: 'u@test.com' });
    pool.query.mockRejectedValue(new Error('db'));
    const res = await request(app).post('/auth/admin/google').send({ idToken: 'x' });
    expect(res.status).toBe(500);
  });

  test('POST /auth/company/google 500 si pool lanza', async () => {
    getGooglePayload.mockResolvedValue({ email: 'c@test.com' });
    pool.query.mockRejectedValue(new Error('db'));
    const res = await request(app).post('/auth/company/google').send({ idToken: 'x' });
    expect(res.status).toBe(500);
  });
});
