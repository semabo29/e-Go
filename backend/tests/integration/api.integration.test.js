const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('API integration', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('GET / returns API and DB status', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /stations returns an array', async () => {
    //tests que prueba que la ruta /stations devuelve un array
    const res = await request(app).get('/stations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /stations returns expected station fields when list is not empty', async () => {
    const res = await request(app).get('/stations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('nom');
      expect(res.body[0]).toHaveProperty('latitud');
      expect(res.body[0]).toHaveProperty('longitud');
    }
  });

  test('GET /stations supports valid filters', async () => {
    const res = await request(app).get('/stations').query({
      minKw: 0,
      maxKw: 500,
      ac_dc: 'AC',
      connectorType: 'CCS',
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /stations returns 400 when minKw is greater than maxKw', async () => {
    const res = await request(app).get('/stations').query({
      minKw: 150,
      maxKw: 50,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La potencia mínima no puede ser mayor que la máxima');
  });

  test('GET /stations returns 500 when station query fails', async () => {
    const originalQuery = pool.query;
    pool.query = jest.fn(async () => {
      throw new Error('forced db failure');
    });

    const res = await request(app).get('/stations');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');

    pool.query = originalQuery;
  });

  test('unknown routes return 404 with error payload', async () => {
    const res = await request(app).get('/route-that-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body).toHaveProperty('message');
  });

});
