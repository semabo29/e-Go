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

describe('Stations routes (unit - route/controller)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /stations retorna dades del service', async () => {
    const mockedStations = [{ external_id: 'ST-3', nom: 'Estacio X', latitud: 41.2, longitud: 2.2 }];
    stationService.getStations.mockResolvedValue(mockedStations);

    const res = await request(app).get('/stations');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockedStations);
    expect(stationService.getStations).toHaveBeenCalledWith({
      minKw: undefined,
      maxKw: undefined,
      connectorType: undefined,
      ac_dc: undefined,
      north: undefined,
      south: undefined,
      east: undefined,
      west: undefined,
    });
  });

  test('GET /stations passa filtres al service', async () => {
    stationService.getStations.mockResolvedValue([]);

    const res = await request(app).get('/stations?minKw=50&maxKw=200&connectorType=CCS2&ac_dc=DC');

    expect(res.status).toBe(200);
    expect(stationService.getStations).toHaveBeenCalledWith({
      minKw: '50',
      maxKw: '200',
      connectorType: 'CCS2',
      ac_dc: 'DC',
      north: undefined,
      south: undefined,
      east: undefined,
      west: undefined,
    });
  });

  test('GET /stations retorna 400 quan minKw > maxKw', async () => {
    const res = await request(app).get('/stations?minKw=200&maxKw=50');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/potencia m[ií]nima/i);
    expect(stationService.getStations).not.toHaveBeenCalled();
  });

  test('GET /stations retorna 500 quan el service falla', async () => {
    stationService.getStations.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/stations');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/error obteniendo estaciones/i);
  });
});