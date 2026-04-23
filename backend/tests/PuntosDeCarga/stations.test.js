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

  // -----------------------------------------
  // TESTS DELS FILTRES DE POTÈNCIA (minKw / maxKw)
  // -----------------------------------------
  describe('Filtres de potència: minKw i maxKw', () => {
    beforeEach(async () => {
      // 1. Netegem la taula per tenir un entorn controlat
      await pool.query('DELETE FROM ego.estaciones');

      // 2. Inserim estacions amb diferents potències per poder-les filtrar
      await upsertStation({
        id: 'ST-LENTA',
        designaci_descriptiva: 'Estació Lenta',
        latitud: '41.0',
        longitud: '2.0',
        kw: '7.4' // Menys de 50
      });

      await upsertStation({
        id: 'ST-MIG',
        designaci_descriptiva: 'Estació Mitjana',
        latitud: '41.1',
        longitud: '2.1',
        kw: '50' // Exactament 50
      });

      await upsertStation({
        id: 'ST-RAPIDA',
        designaci_descriptiva: 'Estació Ràpida',
        latitud: '41.2',
        longitud: '2.2',
        kw: '150' // Més de 50, menys de 200
      });

      await upsertStation({
        id: 'ST-ULTRARAPIDA',
        designaci_descriptiva: 'Estació Ultra Ràpida',
        latitud: '41.3',
        longitud: '2.3',
        kw: '350' // Més de 200
      });
    });

    test('retorna només les estacions amb potència >= minKw', async () => {
      const res = await request(app).get('/stations?minKw=50');

      expect(res.status).toBe(200);
      // Pot haver-hi més dades de test en la BD compartida; validem el comportament del filtre.
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      const returnedIds = res.body.map(est => est.external_id);
      expect(returnedIds).toEqual(expect.arrayContaining(['ST-MIG', 'ST-RAPIDA', 'ST-ULTRARAPIDA']));

      res.body.forEach(est => {
        expect(parseFloat(est.kw)).toBeGreaterThanOrEqual(50);
      });
    });

    test('retorna només les estacions amb potència <= maxKw', async () => {
      const res = await request(app).get('/stations?maxKw=100');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // Ha de trobar ST-LENTA i ST-MIG

      res.body.forEach(est => {
        expect(parseFloat(est.kw)).toBeLessThanOrEqual(100);
      });
    });

    test('retorna només les estacions dins del rang (minKw i maxKw alhora)', async () => {
      const res = await request(app).get('/stations?minKw=22&maxKw=200');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // Ha de trobar ST-MIG (50) i ST-RAPIDA (150)

      res.body.forEach(est => {
        const kw = parseFloat(est.kw);
        expect(kw).toBeGreaterThanOrEqual(22);
        expect(kw).toBeLessThanOrEqual(200);
      });
    });

    test('retorna un array buit si el rang no coincideix amb cap estació', async () => {
      const res = await request(app).get('/stations?minKw=400&maxKw=500');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    test('retorna error 400 si minKw és major que maxKw', async () => {
          // Fem una petició on el mínim (150) és més gran que el màxim (50)
          const res = await request(app).get('/stations?minKw=150&maxKw=50');

          // Comprovem que ens bloqueja amb un 400 Bad Request
          expect(res.status).toBe(400);

          // Comprovem que ens retorna el missatge d'error correcte
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toBe('La potencia mínima no puede ser mayor que la máxima');
        });
  });

  // -----------------------------------------
  // TESTS DELS FILTRES (AC/DC i Connector)
  // -----------------------------------------
  describe('Filtres de cerca: ac_dc i connectorType', () => {
    beforeEach(async () => {
      // 1. Netegem la taula per tenir un entorn controlat
      await pool.query('DELETE FROM ego.estaciones');

      // 2. Inserim estacions amb dades variades per poder-les filtrar
      await upsertStation({
        id: 'ST-AC-TYPE2',
        designaci_descriptiva: 'Càrrega Lenta',
        latitud: '41.0',
        longitud: '2.0',
        kw: '22',
        ac_dc: 'AC',
        tipus_connexi: 'Type 2' // Segons el teu model upsertStation, s'anomena "tipus_connexi" quan ve de l'API
      });

      await upsertStation({
        id: 'ST-DC-CCS2',
        designaci_descriptiva: 'Càrrega Ràpida',
        latitud: '41.1',
        longitud: '2.1',
        kw: '150',
        ac_dc: 'DC',
        tipus_connexi: 'CCS2'
      });

      await upsertStation({
        id: 'ST-MIX',
        designaci_descriptiva: 'Càrrega Mixta',
        latitud: '41.2',
        longitud: '2.2',
        kw: '50',
        ac_dc: 'AC/DC', // Cas híbrid per provar l'ILIKE '%AC%'
        tipus_connexi: 'CHAdeMO'
      });
    });

    test('retorna només les estacions de corrent altern quan passem ac_dc=AC', async () => {
      const res = await request(app).get('/stations?ac_dc=AC');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // Ha de trobar ST-AC-TYPE2 i ST-MIX (perquè porta "AC/DC")

      // Comprovem que cap de les retornades és exclusivament DC
      res.body.forEach(est => {
        expect(est.ac_dc.toUpperCase()).toContain('AC');
      });
    });

    test('retorna només les estacions de corrent continu quan passem ac_dc=DC', async () => {
      const res = await request(app).get('/stations?ac_dc=DC');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // Ha de trobar ST-DC-CCS2 i ST-MIX

      res.body.forEach(est => {
        expect(est.ac_dc.toUpperCase()).toContain('DC');
      });
    });

    test('retorna l\'estació correcta quan es filtra per tipus de connector', async () => {
      const res = await request(app).get('/stations?connectorType=CCS2');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].external_id).toBe('ST-DC-CCS2');
      expect(res.body[0].tipus_connexio).toBe('CCS2');
    });

    test('retorna estacions filtrant de manera combinada (potència mínima + connector + corrent)', async () => {
      // Volem una estació DC, de més de 100kW, amb connector CCS2
      const res = await request(app).get('/stations?ac_dc=DC&minKw=100&connectorType=CCS2');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].external_id).toBe('ST-DC-CCS2');
      expect(parseFloat(res.body[0].kw)).toBeGreaterThanOrEqual(100);
    });

    test('retorna un array buit (200 OK) si cap estació compleix els filtres', async () => {
      // Busquem un connector inventat
      const res = await request(app).get('/stations?connectorType=ConnectorInventat');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  afterAll(async () => {
    // Esborrem TOTES les estacions de prova abans de marxar
    await pool.query('DELETE FROM ego.estaciones');
    await pool.end();
  });
});