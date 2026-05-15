const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcryptjs');

const { pool } = require('../../lib/db');
const { getGooglePayload } = require('../../lib/authHelpers');
const userModel = require('../../models/userModel');

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

  test('POST /auth/company/local/login -> 400 si faltan datos', async () => {
    const res = await request(app).post('/auth/company/local/login').send({});
    expect(res.status).toBe(400);
  });

  test('POST /auth/company/local/login -> 401 si contraseña incorrecta', async () => {
    jest.spyOn(userModel, 'findCompanyByEmailWithPassword').mockResolvedValue({
      id: 5,
      user_id: 8,
      email: 'empresa@example.com',
      username: 'empresa',
      nombre: 'ChargeCo',
      password_hash: 'hash',
      company_since: '2026-04-19T10:00:00.000Z',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const res = await request(app)
      .post('/auth/company/local/login')
      .send({ email: 'empresa@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
    jest.restoreAllMocks();
  });

  test('POST /auth/company/local/login -> 200 con JWT company', async () => {
    jest.spyOn(userModel, 'findCompanyByEmailWithPassword').mockResolvedValue({
      id: 5,
      user_id: 8,
      email: 'empresa@example.com',
      username: 'empresa',
      nombre: 'ChargeCo',
      password_hash: 'hash',
      company_since: '2026-04-19T10:00:00.000Z',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app)
      .post('/auth/company/local/login')
      .send({ email: 'empresa@example.com', password: 'secret12' });
    expect(res.status).toBe(200);
    expect(res.body.company.email).toBe('empresa@example.com');
    expect(res.body.company.nombre).toBe('ChargeCo');
    expect(res.body.token).toBeTruthy();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('company');
    expect(decoded.sub).toBe(5);
    expect(decoded.user_id).toBe(8);
    jest.restoreAllMocks();
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

  test('PATCH /company/profile -> 400 si nombre vacio', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 5, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, is_banned: false }] });

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '   ' });

    expect(res.status).toBe(400);
  });

  test('PATCH /company/profile -> 200 actualiza nombre', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 5, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 5, nombre: 'Nuevo SL', created_at: '2026-01-01T00:00:00.000Z' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 5, email: 'empresa@example.com', username: 'empresa' }],
      });

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '  Nuevo SL  ' });

    expect(res.status).toBe(200);
    expect(res.body.company.nombre).toBe('Nuevo SL');
  });

  test('PUT /company/profile -> 200 actualiza nombre', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 5, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 5, nombre: 'Otro SL', created_at: '2026-01-01T00:00:00.000Z' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 5, email: 'empresa@example.com', username: 'empresa' }],
      });

    const res = await request(app)
      .put('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Otro SL' });

    expect(res.status).toBe(200);
    expect(res.body.company.nombre).toBe('Otro SL');
  });

  test('GET /company/user -> 200 devuelve perfil', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 8, is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 8,
            user_id: 8,
            email: 'empresa@example.com',
            username: 'empresa',
            nombre: 'ChargeCo',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

    const res = await request(app)
      .get('/company/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.company.nombre).toBe('ChargeCo');
  });

  test('GET /company/user -> 404 si empresa no existe', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 8, is_banned: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/company/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('GET /company/user -> 400 si token sin user_id ni sub valido', async () => {
    const token = jwt.sign(
      { sub: 'x', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] });

    const res = await request(app)
      .get('/company/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test('PATCH /company/profile -> 404 si empresa no encontrada', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 5, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, is_banned: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X' });

    expect(res.status).toBe(404);
  });

  test('GET /company/user -> 500 si falla la consulta', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 8, is_banned: false }] })
      .mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .get('/company/user')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
  });

  test('PATCH /company/profile -> 500 si falla la actualizacion', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 5, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, is_banned: false }] });
    jest.spyOn(userModel, 'updateCompanyNombre').mockRejectedValue(new Error('db fail'));

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Fallo' });

    expect(res.status).toBe(500);
    jest.restoreAllMocks();
  });

  test('PATCH /company/profile -> 400 si token invalido para empresa', async () => {
    const token = jwt.sign({ sub: 'bad', role: 'company' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] });

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X' });

    expect(res.status).toBe(400);
  });

  test('PATCH /company/profile -> 200 prioriza user_id del JWT frente a sub', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 8, is_banned: false }] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 8, nombre: 'Nombre OK', created_at: '2026-01-01T00:00:00.000Z' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 8, email: 'empresa@example.com', username: 'empresa' }],
      });

    const res = await request(app)
      .patch('/company/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nombre OK' });

    expect(res.status).toBe(200);
    expect(res.body.company.user_id).toBe(8);
    expect(res.body.company.nombre).toBe('Nombre OK');
  });
});
