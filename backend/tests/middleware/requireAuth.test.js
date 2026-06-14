const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { requireAuth } = require('../../middleware/requireAuth');

const app = express();
app.get('/protected', requireAuth, (req, res) => res.json({ user: req.user }));

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  test('-> 401 sin cabecera Authorization', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Falta token de autorizacion');
  });

  test('-> 401 si el esquema no es Bearer', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Falta token de autorizacion');
  });

  test('-> 401 si falta el token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Falta token de autorizacion');
  });

  test('-> 500 si JWT_SECRET no está configurado', async () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ sub: 1 }, 'other-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('JWT_SECRET no configurado');
  });

  test('-> 401 con token inválido', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido o expirado');
  });

  test('-> 401 con token expirado', async () => {
    const token = jwt.sign({ sub: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido o expirado');
  });

  test('-> 200 con token válido y req.user poblado', async () => {
    const payload = { sub: 42, email: 'user@test.com' };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.sub).toBe(42);
    expect(res.body.user.email).toBe('user@test.com');
  });
});
