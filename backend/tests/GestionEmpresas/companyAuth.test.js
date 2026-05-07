const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');

const { pool } = require('../../lib/db');
const { getGooglePayload } = require('../../lib/authHelpers');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  USUARIOS_TABLE: '"ego"."usuarios"',
  ADMINS_TABLE: '"ego"."admins"',
  EMPRESAS_TABLE: '"ego"."empresas"',
}));

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
  createPendingToken: jest.fn(),
  verifyPendingToken: jest.fn(),
}));

const authRoutes = require('../../routes/auth');
const companyRoutes = require('../../routes/company');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/company', companyRoutes);

describe('Company auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    pool.query.mockResolvedValue({ rows: [{ id: 5, is_banned: false }] });
  });

  test('POST /auth/company/google -> 403 si no es empresa', async () => {
    getGooglePayload.mockResolvedValue({ email: 'user@example.com' });
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_banned: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/company/google')
      .send({ idToken: 'ok' });

    expect(res.status).toBe(403);
  });

  test('POST /auth/company/google -> 200 si es empresa', async () => {
    getGooglePayload.mockResolvedValue({ email: 'empresa@example.com' });
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            user_id: 8,
            nombre: 'ChargeCo',
            company_since: '2026-04-19T10:00:00.000Z',
            email: 'empresa@example.com',
            username: 'empresa',
          },
        ],
      });

    const res = await request(app)
      .post('/auth/company/google')
      .send({ idToken: 'ok' });

    expect(res.status).toBe(200);
    expect(res.body.company.id).toBe(5);
    expect(res.body.token).toBeTruthy();

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe(5);
    expect(decoded.user_id).toBe(8);
    expect(decoded.role).toBe('company');
  });

  test('GET /company/me -> 200 con token valido', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/company/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.company.role).toBe('company');
  });
});
