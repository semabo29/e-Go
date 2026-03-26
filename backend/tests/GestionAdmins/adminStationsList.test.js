const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { requireAdmin } = require('../../middleware/requireAdmin');
const adminStationController = require('../../controllers/adminStationController');
const stationModel = require('../../models/stationModel');

jest.mock('../../models/stationModel', () => ({
  getManualStationsByAdmin: jest.fn(),
}));

const app = express();
app.use(express.json());
app.get('/admin/stations/mine', requireAdmin, adminStationController.listMyManualStations);

describe('Admin stations list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  function authHeader() {
    const token = jwt.sign(
      { sub: 42, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { Authorization: `Bearer ${token}` };
  }

  test('GET /admin/stations/mine -> 401 sin token', async () => {
    const res = await request(app).get('/admin/stations/mine');
    expect(res.status).toBe(401);
  });

  test('GET /admin/stations/mine -> 200 devuelve lista', async () => {
    stationModel.getManualStationsByAdmin.mockResolvedValue([
      { id: 1, nom: 'A', created_at: '2026-03-20T10:00:00.000Z' },
      { id: 2, nom: 'B', created_at: '2026-03-21T10:00:00.000Z' },
    ]);
    const res = await request(app)
      .get('/admin/stations/mine')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});
