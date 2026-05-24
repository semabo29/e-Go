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
  createManualStation: jest.fn(),
  updateManualStation: jest.fn(),
  deleteManualStation: jest.fn(),
}));

const app = express();
app.use(express.json());

app.post('/admin/stations', requireAdmin, adminStationController.createManualStation);
app.patch('/admin/stations/:id', requireAdmin, adminStationController.updateManualStation);
app.delete('/admin/stations/:id', requireAdmin, adminStationController.deleteManualStation);

describe('Admin stations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 1, is_banned: false });
  });

  function authHeader() {
    const token = jwt.sign(
      { sub: 1, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { Authorization: `Bearer ${token}` };
  }

  test('POST /admin/stations -> 400 si falta nom', async () => {
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      latitud: 41.1,
      longitud: 2.1,
    });
    expect(res.status).toBe(400);
  });

  test('POST /admin/stations -> 400 si lat/long invalidos', async () => {
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      nom: 'Manual',
      latitud: 'no',
      longitud: 2.1,
    });
    expect(res.status).toBe(400);
  });

  test('POST /admin/stations -> 400 si latitud o longitud estan fuera de rango', async () => {
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      nom: 'Manual',
      latitud: 91,
      longitud: 181,
    });
    expect(res.status).toBe(400);
  });

  test('POST /admin/stations -> 201 crea manual', async () => {
    stationModel.createManualStation.mockResolvedValue({
      id: 10,
      nom: 'Manual',
      latitud: 41.1,
      longitud: 2.1,
      is_manual: true,
      created_by_admin_id: 1,
    });
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      nom: 'Manual',
      latitud: 41.1,
      longitud: 2.1,
      kw: 22,
    });
    expect(res.status).toBe(201);
    expect(res.body.is_manual).toBe(true);
    expect(res.body.created_by_admin_id).toBe(1);
  });

  test('PATCH /admin/stations/:id -> 400 si id invalido', async () => {
    const res = await request(app).patch('/admin/stations/abc').set(authHeader()).send({ nom: 'X' });
    expect(res.status).toBe(400);
  });

  test('PATCH /admin/stations/:id -> 404 si no existe', async () => {
    stationModel.updateManualStation.mockResolvedValue(null);
    const res = await request(app).patch('/admin/stations/123').set(authHeader()).send({ nom: 'X' });
    expect(res.status).toBe(404);
  });

  test('PATCH /admin/stations/:id -> 200 si actualiza', async () => {
    stationModel.updateManualStation.mockResolvedValue({
      id: 12,
      nom: 'Nuevo',
      is_manual: true,
    });
    const res = await request(app).patch('/admin/stations/12').set(authHeader()).send({ nom: 'Nuevo' });
    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('Nuevo');
  });

  test('PATCH /admin/stations/:id -> 400 si latitud esta fuera de rango', async () => {
    const res = await request(app).patch('/admin/stations/12').set(authHeader()).send({ latitud: -91 });
    expect(res.status).toBe(400);
  });

  test('PATCH /admin/stations/:id -> 400 si longitud esta fuera de rango', async () => {
    const res = await request(app).patch('/admin/stations/12').set(authHeader()).send({ longitud: 181 });
    expect(res.status).toBe(400);
  });

  test('DELETE /admin/stations/:id -> 400 si id invalido', async () => {
    const res = await request(app).delete('/admin/stations/xx').set(authHeader());
    expect(res.status).toBe(400);
  });

  test('DELETE /admin/stations/:id -> 404 si no existe', async () => {
    stationModel.deleteManualStation.mockResolvedValue(null);
    const res = await request(app).delete('/admin/stations/99').set(authHeader());
    expect(res.status).toBe(404);
  });

  test('POST /admin/stations -> 409 si external_id duplicado', async () => {
    const err = new Error('duplicate');
    err.code = '23505';
    stationModel.createManualStation.mockRejectedValue(err);
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      nom: 'Manual',
      latitud: 41.1,
      longitud: 2.1,
    });
    expect(res.status).toBe(409);
  });

  test('POST /admin/stations -> 500 si falla el modelo', async () => {
    stationModel.createManualStation.mockRejectedValue(new Error('db fail'));
    const res = await request(app).post('/admin/stations').set(authHeader()).send({
      nom: 'Manual',
      latitud: 41.1,
      longitud: 2.1,
    });
    expect(res.status).toBe(500);
  });

  test('PATCH /admin/stations/:id -> 500 si falla el modelo', async () => {
    stationModel.updateManualStation.mockRejectedValue(new Error('db fail'));
    const res = await request(app).patch('/admin/stations/12').set(authHeader()).send({ nom: 'X' });
    expect(res.status).toBe(500);
  });

  test('DELETE /admin/stations/:id -> 500 si falla el modelo', async () => {
    stationModel.deleteManualStation.mockRejectedValue(new Error('db fail'));
    const res = await request(app).delete('/admin/stations/5').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('DELETE /admin/stations/:id -> 200 si borra', async () => {
    stationModel.deleteManualStation.mockResolvedValue({ id: 5 });
    const res = await request(app).delete('/admin/stations/5').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST con body null usa fallback de validacion', async () => {
    const res = await request(app).post('/admin/stations').set(authHeader()).send(null);
    expect(res.status).toBe(400);
  });

  test('PATCH con body null aplica patch vacio', async () => {
    stationModel.updateManualStation.mockResolvedValue({ id: 5, nom: 'Igual' });
    const res = await request(app).patch('/admin/stations/5').set(authHeader()).send(null);
    expect(res.status).toBe(200);
    expect(stationModel.updateManualStation).toHaveBeenCalledWith(5, {});
  });
});
