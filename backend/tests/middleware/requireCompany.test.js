const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const userModel = require('../../models/userModel');
const { requireCompany } = require('../../middleware/requireCompany');

const app = express();
app.get('/protected', requireCompany, (req, res) => res.json({ company: req.company }));

describe('requireCompany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 8, is_banned: false });
  });

  test('-> 401 sin Authorization', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  test('-> 401 con token invalido', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });

  test('-> 500 si falta JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ sub: 5, role: 'company' }, 'other-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });

  test('-> 403 si role no es company', async () => {
    const token = jwt.sign({ sub: 5, role: 'admin' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('-> 403 si empresa baneada (user_id del JWT)', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 8, is_banned: true });
    const token = jwt.sign(
      { sub: 5, user_id: 8, role: 'company' },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('-> usa sub si user_id no es valido', async () => {
    const token = jwt.sign({ sub: 5, role: 'company' }, process.env.JWT_SECRET);
    await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(userModel.findByIdWithBanStatus).toHaveBeenCalledWith(5);
  });

  test('-> 401 si usuario no encontrado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue(null);
    const token = jwt.sign({ sub: 5, user_id: 8, role: 'company' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('-> 200 con token company valido', async () => {
    const token = jwt.sign(
      { sub: 5, user_id: 8, email: 'empresa@test.com', role: 'company' },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.company.role).toBe('company');
  });
});
