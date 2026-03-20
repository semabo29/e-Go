// tests/PuntosDeCarga/stations.test.js
const request = require('supertest');
const express = require('express');
const stationRouter = require('../../routes/stations');
const { getAllStations, upsertStation } = require('../../models/stationModel');
const { pool } = require('../../lib/db');

const app = express();
app.use(express.json());
app.use('/stations', stationRouter);

describe('Tests de estaciones completos', () => {

  // ----------------------------
  // StationModel - Consultas
  // ----------------------------
  describe('StationModel - Consultas', () => {
    test('se genera la consulta SQL con filtrado por coordenadas', async () => {
      const res = await getAllStations({ north: 41.5, south: 41.0, east: 2.5, west: 2.0 });
      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ----------------------------
  // Rutas de estaciones
  // ----------------------------
  describe('stationsRoutes', () => {

    beforeEach(async () => {
      // Limpiamos la tabla antes de cada test
      await pool.query('DELETE FROM ego.estaciones');
      // Insertamos una estación de prueba
      await upsertStation({
        id: 'ST-3',
        nom: 'Estación X',
        latitud: '41.2',
        longitud: '2.2',
        kw: '50'
      });
    });

    test('cada estación devuelta por la API tiene external_id, nom, latitud y longitud', async () => {
      const res = await request(app).get('/stations');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const station = res.body.find(s => s.external_id === 'ST-3');
      expect(station).toBeDefined();
      expect(station).toHaveProperty('external_id');
      expect(station).toHaveProperty('nom');
      expect(station).toHaveProperty('latitud');
      expect(station).toHaveProperty('longitud');
    });

    test('devuelve 500 si la base de datos falla', async () => {
      const originalQuery = pool.query;
      pool.query = async () => { throw new Error('DB Error'); };

      const res = await request(app).get('/stations');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');

      pool.query = originalQuery;
    });
  });

  // ----------------------------
  // Guardar / Upsert en BD
  // ----------------------------
  describe('StationModel - Guardar en BD', () => {

    beforeEach(async () => {
      await pool.query('DELETE FROM ego.estaciones');
    });

    afterAll(async () => {
      await pool.end();
    });

    test('comprobar que un mismo punto no se inserta más de una vez', async () => {
      const mockEst = {
        id: 'ID-UNICO-123',
        promotor_gestor: 'Tesla',
        latitud: '41.3879',
        longitud: '2.16992',
        designaci_descriptiva: 'Supercharger BCN',
        kw: '150',
        ac_dc: 'DC',
        municipi: 'Barcelona'
      };

      await upsertStation(mockEst);
      await upsertStation(mockEst);

      const res = await pool.query(
        'SELECT COUNT(*) FROM ego.estaciones WHERE external_id = $1',
        [mockEst.id]
      );

      expect(parseInt(res.rows[0].count)).toBe(1);
    });

    test('debe actualizar los datos si la estación ya existe (Upsert)', async () => {
      const externalId = 'ST-001';

      await upsertStation({
        id: externalId,
        nom: 'Estación Antigua',
        latitud: '41.0',
        longitud: '2.0',
        kw: '50'
      });

      await upsertStation({
        id: externalId,
        designaci_descriptiva: 'Estación Actualizada',
        latitud: '41.0',
        longitud: '2.0',
        kw: '100'
      });

      const res = await pool.query(
        'SELECT nom, kw FROM ego.estaciones WHERE external_id = $1',
        [externalId]
      );

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].nom).toBe('Estación Actualizada');
      expect(parseFloat(res.rows[0].kw)).toBe(100);
    });

  });
});