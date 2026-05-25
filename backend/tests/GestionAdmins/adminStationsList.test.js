const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const { requireAdmin } = require('../../middleware/requireAdmin');
const adminStationController = require('../../controllers/adminStationController');
const stationModel = require('../../models/stationModel');
const userModel = require('../../models/userModel');

jest.mock('../../models/stationModel', () => ({
  getManualStationsByAdmin: jest.fn(),
  getAllStationsForAdmin: jest.fn(),
  setStationOperatiu: jest.fn(),
}));

const app = express();
app.use(express.json());
app.get('/admin/stations/mine', requireAdmin, adminStationController.listMyManualStations);
app.get('/admin/stations', requireAdmin, adminStationController.listAllStations);
app.patch('/admin/stations/:id/operatiu', requireAdmin, adminStationController.setStationOperatiu);

describe('Admin stations list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 42, is_banned: false });
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

  test('GET /admin/stations/mine -> 500 si falla el modelo', async () => {
    stationModel.getManualStationsByAdmin.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/admin/stations/mine').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('GET /admin/stations/mine -> 403 si admin esta baneado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 42, is_banned: true });
    const res = await request(app)
      .get('/admin/stations/mine')
      .set(authHeader());
    expect(res.status).toBe(403);
  });

  test('GET /admin/stations -> 200 lista paginada sin hasMore', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, nom: `S${i}` }));
    stationModel.getAllStationsForAdmin.mockResolvedValue(rows);
    const res = await request(app).get('/admin/stations').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.stations).toHaveLength(50);
    expect(res.body.hasMore).toBe(false);
    expect(stationModel.getAllStationsForAdmin).toHaveBeenCalledWith({ q: '', limit: 51, offset: 0 });
  });

  test('GET /admin/stations -> 200 hasMore cuando hay mas de 50', async () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }));
    stationModel.getAllStationsForAdmin.mockResolvedValue(rows);
    const res = await request(app).get('/admin/stations').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.stations).toHaveLength(50);
    expect(res.body.hasMore).toBe(true);
  });

  test('GET /admin/stations -> pasa q recortada y offset', async () => {
    stationModel.getAllStationsForAdmin.mockResolvedValue([]);
    const res = await request(app)
      .get('/admin/stations?q=%20bcn%20&offset=100')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(stationModel.getAllStationsForAdmin).toHaveBeenCalledWith({ q: 'bcn', limit: 51, offset: 100 });
  });

  test('GET /admin/stations -> 500 si falla el modelo', async () => {
    stationModel.getAllStationsForAdmin.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/admin/stations').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('PATCH /admin/stations/:id/operatiu -> 400 si id invalido', async () => {
    const res = await request(app)
      .patch('/admin/stations/0/operatiu')
      .set(authHeader())
      .send({ operatiu: true });
    expect(res.status).toBe(400);
  });

  test('PATCH /admin/stations/:id/operatiu -> 400 si id no es entero', async () => {
    const res = await request(app)
      .patch('/admin/stations/abc/operatiu')
      .set(authHeader())
      .send({ operatiu: true });
    expect(res.status).toBe(400);
  });

  test('PATCH /admin/stations/:id/operatiu -> 400 si operatiu no es boolean', async () => {
    const res = await request(app)
      .patch('/admin/stations/5/operatiu')
      .set(authHeader())
      .send({ operatiu: 'si' });
    expect(res.status).toBe(400);
  });

  test('PATCH /admin/stations/:id/operatiu -> 404 si no existe', async () => {
    stationModel.setStationOperatiu.mockResolvedValue(null);
    const res = await request(app)
      .patch('/admin/stations/99/operatiu')
      .set(authHeader())
      .send({ operatiu: false });
    expect(res.status).toBe(404);
  });

  test('PATCH /admin/stations/:id/operatiu -> 200 actualiza', async () => {
    stationModel.setStationOperatiu.mockResolvedValue({ id: 5, operatiu: true });
    const res = await request(app)
      .patch('/admin/stations/5/operatiu')
      .set(authHeader())
      .send({ operatiu: true });
    expect(res.status).toBe(200);
    expect(res.body.operatiu).toBe(true);
  });

  test('PATCH /admin/stations/:id/operatiu -> 500 si falla el modelo', async () => {
    stationModel.setStationOperatiu.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .patch('/admin/stations/5/operatiu')
      .set(authHeader())
      .send({ operatiu: true });
    expect(res.status).toBe(500);
  });
});
