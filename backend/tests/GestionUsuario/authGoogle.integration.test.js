const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  USUARIOS_TABLE: '"ego"."usuarios"',
  ADMINS_TABLE: '"ego"."admins"',
}));

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
  createPendingToken: jest.fn(() => 'pending_token_mock'),
  verifyPendingToken: jest.fn(),
}));

const { pool } = require('../../lib/db');
const { getGooglePayload, createPendingToken } = require('../../lib/authHelpers');
const authRouter = require('../../routes/auth');
const adminRouter = require('../../routes/admin');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/admin', adminRouter);

describe('Integración auth Google/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  test('POST /auth/google responde needsUsername para nuevo usuario', async () => {
    getGooglePayload.mockResolvedValue({ email: 'new-user@test.com' });
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).post('/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body.needsUsername).toBe(true);
    expect(res.body.pending_token).toBe('pending_token_mock');
    expect(createPendingToken).toHaveBeenCalledWith('new-user@test.com');
  });

  test('POST /auth/google devuelve usuario existente', async () => {
    getGooglePayload.mockResolvedValue({ email: 'existing@test.com' });
    pool.query.mockResolvedValue({
      rows: [{ id: 7, email: 'existing@test.com', username: 'existing' }],
    });

    const res = await request(app).post('/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(expect.objectContaining({ email: 'existing@test.com' }));
    expect(res.body.needsUsername).toBe(false);
  });

  test('POST /auth/google devuelve 401 con payload inválido', async () => {
    getGooglePayload.mockResolvedValue(null);
    const res = await request(app).post('/auth/google').send({ idToken: 'bad' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/admin/google devuelve 500 si falta JWT_SECRET', async () => {
    process.env.JWT_SECRET = '';
    getGooglePayload.mockResolvedValue({ email: 'admin@test.com' });
    pool.query.mockResolvedValue({
      rows: [{ id: 1, email: 'admin@test.com', username: 'admin' }],
    });

    const res = await request(app).post('/auth/admin/google').send({ idToken: 'ok' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/JWT_SECRET/i);
  });

  test('GET /admin/me devuelve 403 para token no admin', async () => {
    const userToken = jwt.sign({ sub: 2, email: 'user@test.com', role: 'user' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    const res = await request(app).get('/admin/me').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
