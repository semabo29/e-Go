const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('Stations search integration (real DB)', () => {
  const testStationId = 77777;
  const testStationName = 'Estación Search Unica 77777';
  const testStationConnectorType = 'CCS2';
  const testStationAcDc = 'DC';

  beforeAll(async () => {
    // Limpieza + inserción de una estación de prueba
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.query(
      `
      INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, ac_dc, tipus_connexio, is_manual)
      VALUES ($1, 'TEST-SEARCH-777', $2, 41.38, 2.16, 50, $3, $4, true)
      `,
      [testStationId, testStationName, testStationAcDc, testStationConnectorType]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.end();
  });

  test('GET /stations/search devuelve [] si falta q', async () => {
    // Comprueba el contrato: sin parámetro `q` se devuelve lista vacía.
    const res = await request(app).get('/stations/search');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /stations/search encuentra la estación por nom (200)', async () => {
    // Verifica que la búsqueda por `q` encuentra la estación insertada.
    const res = await request(app).get('/stations/search').query({ q: '77777' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((st) => st.id === testStationId)).toBe(true);
  });

  test('GET /stations/search respeta minKw (kw >= minKw)', async () => {
    // Asegura que el filtro `minKw` aplica sobre la columna `kw`.
    const resLow = await request(app)
      .get('/stations/search')
      .query({ q: '77777', minKw: 40 });

    expect(resLow.status).toBe(200);
    expect(resLow.body.some((st) => st.id === testStationId)).toBe(true);

    const resHigh = await request(app)
      .get('/stations/search')
      .query({ q: '77777', minKw: 60 });

    expect(resHigh.status).toBe(200);
    expect(resHigh.body.some((st) => st.id === testStationId)).toBe(false);
  });

  test('GET /stations/search retorna 400 quan minKw > maxKw', async () => {
    // Valida la validación del controller para rango de potencia inválido.
    const res = await request(app)
      .get('/stations/search')
      .query({ q: '77777', minKw: 60, maxKw: 40 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La potencia mínima no puede ser mayor que la máxima');
  });

  test('GET /stations/search respeta connectorType (tipus_connexio)', async () => {
    // Verifica el filtro de connector sobre `tipus_connexio`.
    const resOk = await request(app)
      .get('/stations/search')
      .query({ q: '77777', connectorType: testStationConnectorType });

    expect(resOk.status).toBe(200);
    expect(resOk.body.some((st) => st.id === testStationId)).toBe(true);

    const resNo = await request(app)
      .get('/stations/search')
      .query({ q: '77777', connectorType: 'CHAdeMO' });

    expect(resNo.status).toBe(200);
    expect(resNo.body.some((st) => st.id === testStationId)).toBe(false);
  });

  test('GET /stations/search respeta ac_dc (AC/DC)', async () => {
    // Verifica el filtro de corriente sobre `ac_dc`.
    const resOk = await request(app)
      .get('/stations/search')
      .query({ q: '77777', ac_dc: testStationAcDc });

    expect(resOk.status).toBe(200);
    expect(resOk.body.some((st) => st.id === testStationId)).toBe(true);

    const resNo = await request(app)
      .get('/stations/search')
      .query({ q: '77777', ac_dc: 'AC' });

    expect(resNo.status).toBe(200);
    expect(resNo.body.some((st) => st.id === testStationId)).toBe(false);
  });
});

