const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const { requireAdmin } = require('../../middleware/requireAdmin');
const adminCompanyRequestController = require('../../controllers/adminCompanyRequestController');
const stationRequestModel = require('../../models/stationRequestModel');
const userModel = require('../../models/userModel');

jest.mock('../../models/stationRequestModel', () => ({
  getPendingRequests: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
}));

const app = express();
app.use(express.json());
app.get('/admin/station-requests/pending', requireAdmin, adminCompanyRequestController.listPendingRequests);
app.post('/admin/station-requests/:id/approve', requireAdmin, adminCompanyRequestController.approveRequest);
app.post('/admin/station-requests/:id/reject', requireAdmin, adminCompanyRequestController.rejectRequest);

describe('Admin station requests', () => {
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

  test('GET /admin/station-requests/pending -> 200 devuelve pendientes', async () => {
    stationRequestModel.getPendingRequests.mockResolvedValue([{ id: 1, action: 'create' }]);

    const res = await request(app)
      .get('/admin/station-requests/pending')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body[0].action).toBe('create');
  });

  test('POST /admin/station-requests/:id/approve -> 404 si no existe', async () => {
    stationRequestModel.approveRequest.mockResolvedValue(null);

    const res = await request(app)
      .post('/admin/station-requests/21/approve')
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  test('POST /admin/station-requests/:id/approve -> 200 si aprueba', async () => {
    stationRequestModel.approveRequest.mockResolvedValue({
      request: { id: 21, status: 'approved' },
      station: { id: 77, nom: 'Nueva' },
    });

    const res = await request(app)
      .post('/admin/station-requests/21/approve')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.station.id).toBe(77);
  });

  test('GET /admin/station-requests/pending -> 500 si falla el modelo', async () => {
    stationRequestModel.getPendingRequests.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .get('/admin/station-requests/pending')
      .set(authHeader());
    expect(res.status).toBe(500);
  });

  test('POST /admin/station-requests/:id/approve -> 400 si id invalido', async () => {
    const res = await request(app)
      .post('/admin/station-requests/abc/approve')
      .set(authHeader());
    expect(res.status).toBe(400);
  });

  test('POST /admin/station-requests/:id/approve -> 409 si ya resuelta', async () => {
    const err = new Error('Ya resuelta');
    err.code = 'REQUEST_ALREADY_RESOLVED';
    stationRequestModel.approveRequest.mockRejectedValue(err);

    const res = await request(app)
      .post('/admin/station-requests/21/approve')
      .set(authHeader());
    expect(res.status).toBe(409);
  });

  test('POST /admin/station-requests/:id/approve -> 404 si estacion no existe', async () => {
    const err = new Error('Estacion no encontrada');
    err.code = 'STATION_NOT_FOUND';
    stationRequestModel.approveRequest.mockRejectedValue(err);

    const res = await request(app)
      .post('/admin/station-requests/21/approve')
      .set(authHeader());
    expect(res.status).toBe(404);
  });

  test('POST /admin/station-requests/:id/reject -> 400 si id invalido', async () => {
    const res = await request(app)
      .post('/admin/station-requests/x/reject')
      .set(authHeader());
    expect(res.status).toBe(400);
  });

  test('POST /admin/station-requests/:id/reject -> 404 si no hay pendiente', async () => {
    stationRequestModel.rejectRequest.mockResolvedValue(null);
    const res = await request(app)
      .post('/admin/station-requests/22/reject')
      .set(authHeader());
    expect(res.status).toBe(404);
  });

  test('POST /admin/station-requests/:id/reject -> 200 si rechaza', async () => {
    stationRequestModel.rejectRequest.mockResolvedValue({ id: 22, status: 'rejected' });

    const res = await request(app)
      .post('/admin/station-requests/22/reject')
      .set(authHeader())
      .send({ rejection_reason: 'Datos incompletos' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  test('POST /admin/station-requests/:id/approve -> 500 si error inesperado', async () => {
    stationRequestModel.approveRequest.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .post('/admin/station-requests/21/approve')
      .set(authHeader());
    expect(res.status).toBe(500);
  });

  test('POST /admin/station-requests/:id/reject -> 500 si error inesperado', async () => {
    stationRequestModel.rejectRequest.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .post('/admin/station-requests/22/reject')
      .set(authHeader());
    expect(res.status).toBe(500);
  });
});
