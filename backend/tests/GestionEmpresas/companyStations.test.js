const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const { requireCompany } = require('../../middleware/requireCompany');
const companyStationController = require('../../controllers/companyStationController');
const stationModel = require('../../models/stationModel');
const stationRequestModel = require('../../models/stationRequestModel');
const userModel = require('../../models/userModel');

jest.mock('../../models/stationModel', () => ({
  getManualStationsByCompany: jest.fn(),
  getCompanyOwnedManualStationById: jest.fn(),
}));

jest.mock('../../models/stationRequestModel', () => ({
  createRequest: jest.fn(),
  getRequestsByCompany: jest.fn(),
}));

const app = express();
app.use(express.json());
app.get('/company/stations/mine', requireCompany, companyStationController.listMyStations);
app.get('/company/station-requests/mine', requireCompany, companyStationController.listMyRequests);
app.post('/company/stations', requireCompany, companyStationController.requestCreateStation);
app.patch('/company/stations/:id', requireCompany, companyStationController.requestUpdateStation);
app.delete('/company/stations/:id', requireCompany, companyStationController.requestDeleteStation);

describe('Company station requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 7, is_banned: false });
  });

  function authHeader() {
    const token = jwt.sign(
      { sub: 7, user_id: 9, email: 'empresa@example.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { Authorization: `Bearer ${token}` };
  }

  test('GET /company/stations/mine -> 200 devuelve estaciones propias', async () => {
    stationModel.getManualStationsByCompany.mockResolvedValue([{ id: 3, nom: 'Empresa 1' }]);

    const res = await request(app)
      .get('/company/stations/mine')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(3);
  });

  test('POST /company/stations -> 201 crea solicitud de alta', async () => {
    stationRequestModel.createRequest.mockResolvedValue({ id: 11, action: 'create', status: 'pending' });

    const res = await request(app)
      .post('/company/stations')
      .set(authHeader())
      .send({ nom: 'Nueva', latitud: 41.1, longitud: 2.1, kw: 22 });

    expect(res.status).toBe(201);
    expect(res.body.action).toBe('create');
    expect(stationRequestModel.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 7, action: 'create' })
    );
  });

  test('PATCH /company/stations/:id -> 404 si la estacion no es de la empresa', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/company/stations/99')
      .set(authHeader())
      .send({ nom: 'Cambio' });

    expect(res.status).toBe(404);
  });

  test('GET /company/station-requests/mine -> 200 devuelve solicitudes', async () => {
    stationRequestModel.getRequestsByCompany.mockResolvedValue([{ id: 2, action: 'update' }]);
    const res = await request(app)
      .get('/company/station-requests/mine')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body[0].action).toBe('update');
  });

  test('POST /company/stations -> 400 si falta nom', async () => {
    const res = await request(app)
      .post('/company/stations')
      .set(authHeader())
      .send({ latitud: 41.1, longitud: 2.1 });
    expect(res.status).toBe(400);
  });

  test('PATCH /company/stations/:id -> 400 si id invalido', async () => {
    const res = await request(app)
      .patch('/company/stations/abc')
      .set(authHeader())
      .send({ nom: 'X' });
    expect(res.status).toBe(400);
  });

  test('PATCH /company/stations/:id -> 400 si el patch es invalido', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5, owner_company_id: 7 });
    const res = await request(app)
      .patch('/company/stations/5')
      .set(authHeader())
      .send({ latitud: 999 });
    expect(res.status).toBe(400);
  });

  test('PATCH /company/stations/:id -> 400 si no hay cambios', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5, owner_company_id: 7 });
    const res = await request(app)
      .patch('/company/stations/5')
      .set(authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  test('PATCH /company/stations/:id -> 201 crea solicitud de modificacion', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5, owner_company_id: 7 });
    stationRequestModel.createRequest.mockResolvedValue({ id: 20, action: 'update', status: 'pending' });

    const res = await request(app)
      .patch('/company/stations/5')
      .set(authHeader())
      .send({ nom: 'Actualizado' });

    expect(res.status).toBe(201);
    expect(res.body.action).toBe('update');
  });

  test('DELETE /company/stations/:id -> 400 si id invalido', async () => {
    const res = await request(app).delete('/company/stations/xx').set(authHeader());
    expect(res.status).toBe(400);
  });

  test('DELETE /company/stations/:id -> 404 si no es de la empresa', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue(null);
    const res = await request(app).delete('/company/stations/99').set(authHeader());
    expect(res.status).toBe(404);
  });

  test('GET /company/stations/mine -> 500 si falla el modelo', async () => {
    stationModel.getManualStationsByCompany.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/company/stations/mine').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('GET /company/station-requests/mine -> 500 si falla el modelo', async () => {
    stationRequestModel.getRequestsByCompany.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/company/station-requests/mine').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('POST /company/stations -> 500 si falla el modelo', async () => {
    stationRequestModel.createRequest.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .post('/company/stations')
      .set(authHeader())
      .send({ nom: 'Nueva', latitud: 41.1, longitud: 2.1 });
    expect(res.status).toBe(500);
  });

  test('PATCH /company/stations/:id -> 500 si falla el modelo', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5 });
    stationRequestModel.createRequest.mockRejectedValue(new Error('db fail'));
    const res = await request(app)
      .patch('/company/stations/5')
      .set(authHeader())
      .send({ nom: 'X' });
    expect(res.status).toBe(500);
  });

  test('DELETE /company/stations/:id -> 500 si falla el modelo', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5 });
    stationRequestModel.createRequest.mockRejectedValue(new Error('db fail'));
    const res = await request(app).delete('/company/stations/5').set(authHeader());
    expect(res.status).toBe(500);
  });

  test('DELETE /company/stations/:id -> 201 crea solicitud de borrado', async () => {
    stationModel.getCompanyOwnedManualStationById.mockResolvedValue({ id: 5, owner_company_id: 7 });
    stationRequestModel.createRequest.mockResolvedValue({ id: 15, action: 'delete', status: 'pending' });

    const res = await request(app)
      .delete('/company/stations/5')
      .set(authHeader());

    expect(res.status).toBe(201);
    expect(res.body.action).toBe('delete');
  });
});
