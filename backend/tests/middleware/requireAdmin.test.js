const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const userModel = require('../../models/userModel');
const { requireAdmin } = require('../../middleware/requireAdmin');

const app = express();
app.get('/protected', requireAdmin, (req, res) => res.json({ admin: req.admin }));

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 1, is_banned: false });
  });

  test('-> 401 sin Authorization', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  test('-> 401 con token invalido', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  test('-> 500 si falta JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ sub: 1, role: 'admin' }, 'other-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });

  test('-> 403 si role no es admin', async () => {
    const token = jwt.sign({ sub: 1, role: 'company' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('-> 403 si admin baneado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 1, is_banned: true });
    const token = jwt.sign({ sub: 1, role: 'admin' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('-> 401 si usuario admin no encontrado en BD', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue(null);
    const token = jwt.sign({ sub: 1, role: 'admin' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('-> 200 con token admin valido', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe('admin@test.com');
  });
});
