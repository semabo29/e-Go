// Gestion de usuario - registro (/auth/register)
// Probamos dos cosas muy concretas:
//  - si no mandas username ? responde 400 con error
//  - si mandas pending_token valido + username ? responde 201 con un user (simulando BD y Google)

const request = require('supertest');
const express = require('express');

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
  createPendingToken: jest.fn(),
  verifyPendingToken: jest.fn(),
}));

const { verifyPendingToken } = require('../../lib/authHelpers');
const { pool } = require('../../lib/db');
const authRouter = require('../../routes/auth');

// App mini de prueba solo con las rutas de auth
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('POST /auth/register', () => {
  beforeEach(() => {
    // Mock de pool.query para no tocar la BD real
    pool.query = jest.fn();
    jest.clearAllMocks();
  });

  test('devuelve 400 si falta username', async () => {
    const res = await request(app).post('/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Falta username/i);
  });

  test('crea usuario cuando pending_token es v�lido', async () => {
    verifyPendingToken.mockReturnValue({ email: 'test@example.com' });
    pool.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          email: 'test@example.com',
          username: 'usuario',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ],
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ pending_token: 'token-falso', username: 'usuario' });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

