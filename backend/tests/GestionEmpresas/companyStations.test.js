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
