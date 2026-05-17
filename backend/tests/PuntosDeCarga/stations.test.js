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
    // Verifica que el controlador devuelva exactamente los datos recibidos del servicio.
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
    });
  });

  test('GET /stations passa filtres al service', async () => {
    // Comprueba que los filtros basicos de potencia y tipo se pasen correctamente al servicio.
    stationService.getStations.mockResolvedValue([]);

    const res = await request(app).get('/stations?minKw=50&maxKw=200&connectorType=CCS2&ac_dc=DC');

    expect(res.status).toBe(200);
    expect(stationService.getStations).toHaveBeenCalledWith({
      minKw: '50',
      maxKw: '200',
      connectorType: 'CCS2',
      ac_dc: 'DC',
    });
  });

  test('GET /stations retorna 400 quan minKw > maxKw', async () => {
    // Asegura validacion de rango invalido y evita llamar al servicio.
    const res = await request(app).get('/stations?minKw=200&maxKw=50');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/potencia m[ií]nima/i);
    expect(stationService.getStations).not.toHaveBeenCalled();
  });

  test('GET /stations retorna 500 quan el service falla', async () => {
    // Valida que un error interno del servicio se traduzca a respuesta 500.
    stationService.getStations.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/stations');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/error obteniendo estaciones/i);
  });

  test('GET /stations accepta el cas limit minKw == maxKw', async () => {
    // Verifica el caso limite donde minimo y maximo son iguales.
    stationService.getStations.mockResolvedValue([]);
    const res = await request(app).get('/stations?minKw=50&maxKw=50');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(stationService.getStations).toHaveBeenCalledWith({
      minKw: '50',
      maxKw: '50',
      connectorType: undefined,
      ac_dc: undefined,
    });
  });

  test('GET /stations/search retorna array buit quan no hi ha q', async () => {
    // Verifica que sin texto de busqueda se devuelva lista vacia.
    const res = await request(app).get('/stations/search');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(stationService.searchStations).not.toHaveBeenCalled();
  });

  test('GET /stations/search passa text i filtres al service', async () => {
    // Asegura que el texto de busqueda y filtros lleguen correctamente al servicio.
    const mockedStations = [{ external_id: 'ST-9', nom: 'Barcelona Nord' }];
    stationService.searchStations.mockResolvedValue(mockedStations);

    const res = await request(app).get('/stations/search?q=barcelona&minKw=22&maxKw=100&connectorType=CCS2&ac_dc=DC');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockedStations);
    expect(stationService.searchStations).toHaveBeenCalledWith('barcelona', {
      minKw: '22',
      maxKw: '100',
      connectorType: 'CCS2',
      ac_dc: 'DC',
    });
  });

  test('GET /stations/search retorna 400 quan minKw > maxKw', async () => {
    // Valida rango de potencia invalido en la ruta de busqueda.
    const res = await request(app).get('/stations/search?q=test&minKw=150&maxKw=50');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/potencia m[ií]nima/i);
    expect(stationService.searchStations).not.toHaveBeenCalled();
  });

  test('GET /stations/search retorna 500 quan el service falla', async () => {
    // Comprueba manejo de error interno del servicio durante la busqueda.
    stationService.searchStations.mockRejectedValue(new Error('search fail'));
    const res = await request(app).get('/stations/search?q=lleida');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/error buscando estaciones/i);
  });

  test('GET /stations/sync retorna resultat de sincronitzacio', async () => {
    // Verifica el formato de respuesta cuando la sincronizacion finaliza correctamente.
    stationService.syncStations.mockResolvedValue(27);
    const res = await request(app).get('/stations/sync');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      mensaje: 'Sincronización procesada',
      totalProcesados: 27,
    });
    expect(stationService.syncStations).toHaveBeenCalledTimes(1);
  });

  test('GET /stations/sync retorna 500 quan falla la sincronitzacio', async () => {
    // Comprueba que un fallo de sincronizacion se reporte con estado 500.
    stationService.syncStations.mockRejectedValue(new Error('sync fail'));
    const res = await request(app).get('/stations/sync');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/error sincronizando estaciones/i);
  });
});