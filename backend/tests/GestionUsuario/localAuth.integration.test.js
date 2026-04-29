const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  USUARIOS_TABLE: '"ego"."usuarios"',
  ADMINS_TABLE: '"ego"."admins"',
}));

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
  createPendingToken: jest.fn(),
  verifyPendingToken: jest.fn(),
}));

const { pool } = require('../../lib/db');
const authRouter = require('../../routes/auth');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Integración auth local (email/password)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /auth/local/register devuelve 400 sin username', async () => {
    const res = await request(app).post('/auth/local/register').send({
      email: 'new@test.com',
      password: '123456',
    });
    expect(res.status).toBe(400);
  });

  test('POST /auth/local/register crea usuario válido', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'new@test.com', username: 'newuser' }],
      });

    const res = await request(app).post('/auth/local/register').send({
      email: 'new@test.com',
      password: '123456',
      username: 'newuser',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(expect.objectContaining({ email: 'new@test.com' }));
    expect(pool.query).toHaveBeenCalledTimes(2);
    const [, values] = pool.query.mock.calls[1];
    expect(values[2]).toBeDefined();
    expect(values[2]).not.toBe('123456');
  });

  test('POST /auth/local/login devuelve 401 con contraseña inválida', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    pool.query.mockResolvedValue({
      rows: [
        {
          id: 7,
          email: 'user@test.com',
          username: 'u',
          password_hash: passwordHash,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
    });

    const res = await request(app).post('/auth/local/login').send({
      email: 'user@test.com',
      password: 'wrong12',
    });
    expect(res.status).toBe(401);
  });

  test('POST /auth/local/login devuelve user en credenciales válidas', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    pool.query.mockResolvedValue({
      rows: [
        {
          id: 8,
          email: 'ok@test.com',
          username: 'okuser',
          password_hash: passwordHash,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
    });

    const res = await request(app).post('/auth/local/login').send({
      email: 'ok@test.com',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(
      expect.objectContaining({
        id: 8,
        email: 'ok@test.com',
        username: 'okuser',
      })
    );
  });
});
