const request = require('supertest');
const express = require('express');

jest.mock('../../services/stationService', () => ({
  getStations: jest.fn(),
  searchStations: jest.fn(),
  syncStations: jest.fn(),
}));

const stationRouter = require('../../routes/stations');
const stationService = require('../../services/stationService');

const app = express();
app.use(express.json());
app.use('/stations', stationRouter);

describe("Cercador d'estacions (unit - route/controller)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retorna [] si falta q', async () => {
    const res = await request(app).get('/stations/search');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(stationService.searchStations).not.toHaveBeenCalled();
  });

  test('retorna 400 si minKw > maxKw', async () => {
    const res = await request(app).get('/stations/search?q=bcn&minKw=200&maxKw=50');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/potencia m[ií]nima/i);
    expect(stationService.searchStations).not.toHaveBeenCalled();
  });

  test('crida al service amb q i filtres', async () => {
    const mocked = [{ id: 1, nom: 'Estacio BCN', municipi: 'Barcelona', kw: 50 }];
    stationService.searchStations.mockResolvedValue(mocked);

    const res = await request(app).get('/stations/search?q=barcelona&minKw=50&ac_dc=DC');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mocked);
    expect(stationService.searchStations).toHaveBeenCalledWith('barcelona', {
      minKw: '50',
      maxKw: undefined,
      connectorType: undefined,
      ac_dc: 'DC',
    });
  });

  test('retorna 500 si el service falla', async () => {
    stationService.searchStations.mockRejectedValue(new Error('service fail'));
    const res = await request(app).get('/stations/search?q=barcelona');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/error buscando estaciones/i);
  });
});