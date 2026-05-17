const express = require('express');
const request = require('supertest');

const BARCELONA_GEOCODE = {
  formatted_address: 'Plaça de Catalunya, Barcelona, España',
  geometry: { location: { lat: 41.387, lng: 2.17 } },
  address_components: [
    { types: ['locality'], long_name: 'Barcelona' },
    { types: ['administrative_area_level_2'], long_name: 'Barcelona' },
  ],
};

function mockFetchJson(body, status = 200) {
  global.fetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function buildApp() {
  jest.resetModules();
  const geoRoutes = require('../../routes/geo');
  const app = express();
  app.use('/geo', geoRoutes);
  return app;
}

describe('geoController', () => {
  const originalFetch = global.fetch;
  const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalGeocodingKey = process.env.GOOGLE_GEOCODING_API_KEY;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GOOGLE_MAPS_API_KEY = 'test-geo-key';
    delete process.env.GOOGLE_GEOCODING_API_KEY;
    app = buildApp();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalMapsKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = originalMapsKey;
    if (originalGeocodingKey === undefined) delete process.env.GOOGLE_GEOCODING_API_KEY;
    else process.env.GOOGLE_GEOCODING_API_KEY = originalGeocodingKey;
    console.error.mockRestore();
    jest.resetModules();
  });

  describe('GET /geo/search', () => {
    test('-> 500 si falta API key', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      delete process.env.GOOGLE_GEOCODING_API_KEY;
      app = buildApp();

      const res = await request(app).get('/geo/search').query({ q: 'Barcelona' });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/GOOGLE_MAPS_API_KEY/);
    });

    test('-> 200 [] si query vacia', async () => {
      const res = await request(app).get('/geo/search').query({ q: '   ' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('-> 200 con sugerencias mapeadas', async () => {
      mockFetchJson({ status: 'OK', results: [BARCELONA_GEOCODE] });

      const res = await request(app).get('/geo/search').query({ q: 'Plaça Catalunya' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        formattedAddress: BARCELONA_GEOCODE.formatted_address,
        lat: 41.387,
        lng: 2.17,
        municipi: 'Barcelona',
        provincia: 'Barcelona',
      });
    });

    test('-> 200 [] con ZERO_RESULTS', async () => {
      mockFetchJson({ status: 'ZERO_RESULTS', results: [] });

      const res = await request(app).get('/geo/search').query({ q: 'xyzxyzxyz' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('-> 429 si OVER_QUERY_LIMIT', async () => {
      mockFetchJson({ status: 'OVER_QUERY_LIMIT', results: [] });

      const res = await request(app).get('/geo/search').query({ q: 'Barcelona' });
      expect(res.status).toBe(429);
    });

    test('-> 502 si Google devuelve error de API', async () => {
      mockFetchJson({ status: 'REQUEST_DENIED', error_message: 'The provided API key is invalid.' });

      const res = await request(app).get('/geo/search').query({ q: 'Barcelona' });
      expect(res.status).toBe(502);
      expect(res.body.details).toMatch(/invalid/i);
    });

    test('-> 500 si fetch HTTP falla', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

      const res = await request(app).get('/geo/search').query({ q: 'Barcelona' });
      expect(res.status).toBe(500);
    });

    test('filtra resultados sin coordenadas validas', async () => {
      mockFetchJson({
        status: 'OK',
        results: [
          { formatted_address: 'Sin coords', geometry: { location: { lat: 'x', lng: 2 } } },
          BARCELONA_GEOCODE,
        ],
      });

      const res = await request(app).get('/geo/search').query({ q: 'Barcelona' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /geo/reverse', () => {
    test('-> 500 si falta API key', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      delete process.env.GOOGLE_GEOCODING_API_KEY;
      app = buildApp();

      const res = await request(app).get('/geo/reverse').query({ lat: 41.38, lng: 2.17 });
      expect(res.status).toBe(500);
    });

    test('-> 400 si lat/lng invalidas', async () => {
      const res = await request(app).get('/geo/reverse').query({ lat: 999, lng: 2 });
      expect(res.status).toBe(400);
    });

    test('-> 200 con mejor resultado', async () => {
      mockFetchJson({ status: 'OK', results: [BARCELONA_GEOCODE] });

      const res = await request(app).get('/geo/reverse').query({ lat: 41.387, lng: 2.17 });
      expect(res.status).toBe(200);
      expect(res.body.municipi).toBe('Barcelona');
    });

    test('-> 200 null si no hay resultado mapeable', async () => {
      mockFetchJson({
        status: 'OK',
        results: [{ formatted_address: 'X', geometry: { location: { lat: NaN, lng: 2 } } }],
      });

      const res = await request(app).get('/geo/reverse').query({ lat: 0, lng: 0 });
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    test('-> 429 si OVER_QUERY_LIMIT en reverse', async () => {
      mockFetchJson({ status: 'OVER_QUERY_LIMIT', results: [] });

      const res = await request(app).get('/geo/reverse').query({ lat: 41.38, lng: 2.17 });
      expect(res.status).toBe(429);
    });

    test('-> 502 si error Google en reverse', async () => {
      mockFetchJson({ status: 'REQUEST_DENIED', error_message: 'denied' });

      const res = await request(app).get('/geo/reverse').query({ lat: 41.38, lng: 2.17 });
      expect(res.status).toBe(502);
    });

    test('-> 500 si fetch lanza excepcion', async () => {
      global.fetch.mockRejectedValue(new Error('network'));

      const res = await request(app).get('/geo/reverse').query({ lat: 41.38, lng: 2.17 });
      expect(res.status).toBe(500);
    });
  });
});
