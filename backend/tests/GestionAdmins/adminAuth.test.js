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

const bcrypt = require('bcryptjs');
const userModel = require('../../models/userModel');
const authRoutes = require('../../routes/auth');
const adminRoutes = require('../../routes/admin');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

describe('Admin auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    pool.query.mockResolvedValue({ rows: [{ id: 1, is_banned: false }] });
  });

  test('POST /auth/admin/google -> 400 si faltan credenciales', async () => {
    const res = await request(app).post('/auth/admin/google').send({});
    expect(res.status).toBe(400);
  });

  test('POST /auth/admin/google -> 401 si Google token invalido', async () => {
    getGooglePayload.mockResolvedValue(null);
    const res = await request(app)
      .post('/auth/admin/google')
      .send({ idToken: 'bad' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/admin/google -> 403 si no es admin', async () => {
    getGooglePayload.mockResolvedValue({ email: 'user@example.com' });
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_banned: false }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/auth/admin/google')
      .send({ idToken: 'ok' });
    expect(res.status).toBe(403);
  });

  test('POST /auth/admin/google -> 403 si usuario baneado', async () => {
    getGooglePayload.mockResolvedValue({ email: 'banned@example.com' });
    pool.query.mockResolvedValueOnce({ rows: [{ is_banned: true }] });
    const res = await request(app)
      .post('/auth/admin/google')
      .send({ idToken: 'ok' });
    expect(res.status).toBe(403);
  });

  test('POST /auth/admin/local/login -> 400 si faltan datos', async () => {
    const res = await request(app).post('/auth/admin/local/login').send({});
    expect(res.status).toBe(400);
  });

  test('POST /auth/admin/local/login -> 401 si contraseña incorrecta', async () => {
    jest.spyOn(userModel, 'findAdminByEmailWithPassword').mockResolvedValue({
      id: 1,
      user_id: 1,
      email: 'admin@example.com',
      username: 'admin',
      password_hash: 'hash',
      admin_since: '2026-03-17T00:00:00.000Z',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const res = await request(app)
      .post('/auth/admin/local/login')
      .send({ email: 'admin@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
    jest.restoreAllMocks();
  });

  test('POST /auth/admin/local/login -> 200 con JWT admin', async () => {
    jest.spyOn(userModel, 'findAdminByEmailWithPassword').mockResolvedValue({
      id: 1,
      user_id: 1,
      email: 'admin@example.com',
      username: 'admin',
      password_hash: 'hash',
      admin_since: '2026-03-17T00:00:00.000Z',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app)
      .post('/auth/admin/local/login')
      .send({ email: 'admin@example.com', password: 'secret12' });
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe('admin@example.com');
    expect(res.body.token).toBeTruthy();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
    expect(decoded.email).toBe('admin@example.com');
    jest.restoreAllMocks();
  });

  test('POST /auth/admin/google -> 200 si es admin', async () => {
    getGooglePayload.mockResolvedValue({ email: 'admin@example.com' });
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'admin@example.com', username: 'admin', admin_since: '2026-03-17T00:00:00.000Z' },
        ],
      });
    const res = await request(app)
      .post('/auth/admin/google')
      .send({ idToken: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe('admin@example.com');
    expect(res.body.token).toBeTruthy();

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe('admin@example.com');
    expect(decoded.role).toBe('admin');
  });

  test('GET /admin/me -> 401 si no hay token', async () => {
    const res = await request(app).get('/admin/me');
    expect(res.status).toBe(401);
  });

  test('GET /admin/me -> 401 si token invalido', async () => {
    const res = await request(app)
      .get('/admin/me')
      .set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });

  test('GET /admin/user -> 200 devuelve usuario', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: 'admin@example.com',
            username: 'admin',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      });

    const res = await request(app)
      .get('/admin/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@example.com');
  });

  test('GET /admin/user -> 404 si usuario no existe', async () => {
    const token = jwt.sign(
      { sub: 99, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 99, is_banned: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/admin/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('GET /admin/user -> 500 si falla la consulta', async () => {
    const token = jwt.sign(
      { sub: 1, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] })
      .mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .get('/admin/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
  });

  test('GET /admin/me -> 403 si token es de company', async () => {
    const token = jwt.sign(
      { sub: 5, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('GET /admin/me -> 200 con token valido', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe('admin@example.com');
    expect(res.body.admin.role).toBe('admin');
  });
});
