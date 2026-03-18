// Testing del sistema de estaciones (Modelo y Rutas)
const request = require('supertest');
const express = require('express');
const { pool } = require('../../lib/db');
const stationRouter = require('../../routes/stations');
const { getAllStations } = require('../../models/stationModel');

// Mock del pool de la base de datos
jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/stations', stationRouter);

describe('Tests de los puntos de carga', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StationModel', () => {
    test('se genera la consulta SQL con filtrado por coordenadas', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await getAllStations({ north: 41.5, south: 41.0, east: 2.5, west: 2.0 });

      const queryCall = pool.query.mock.calls[0][0];
      const queryParams = pool.query.mock.calls[0][1];

      expect(queryCall).toContain('latitud <= $1');
      expect(queryCall).toContain('latitud >= $2');
      expect(queryParams).toEqual([41.5, 41.0, 2.5, 2.0]);
    });
  });

  describe('stationsRoutes', () => {
    test('se retorna una lista de estaciones en formato array', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, nom: 'Estación A', latitud: '41.38', longitud: '2.16' },
          { id: 2, nom: 'Estación B', latitud: '41.39', longitud: '2.17' }
        ],
      });

      const res = await request(app).get('/stations');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('latitud');
    });

    test('se procesan los parámetros del viewport correctamente', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .get('/stations')
        .query({ north: 41.5, south: 41.3, east: 2.2, west: 2.0 });

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalled();
    });

    test('devuelve 500 si la base de datos falla', async () => {
      pool.query.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/stations');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
