/**
 * Proves de comportament temporal (ISO 25010 — time behaviour).
 * Requereixen PostgreSQL (mateix entorn que les integració) i RUN_PERF_TESTS=true.
 *
 * PowerShell:
 *   $env:RUN_PERF_TESTS="true"
 *   npm run test:performance
 */
const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');
const {
  THRESHOLDS,
  measureSeries,
  assertWithinThreshold,
} = require('../../lib/perfMetrics');

const runPerf = process.env.RUN_PERF_TESTS === 'true';
const describePerf = runPerf ? describe : describe.skip;

describePerf('Comportament temporal — API (performance)', () => {
  beforeAll(async () => {
    // Escalfament: primera petició pot incloure connexió al pool i càrrega de mòduls.
    await request(app).get('/');
    await request(app).get('/stations');
  });

  afterAll(async () => {
    await pool.end();
  });

  // Comprovació d'estat: GET / verifica API + connexió BD (no és només un ping buit).
  test('GET / respon dins del llindar (màx i p95)', async () => {
    const stats = await measureSeries(() => request(app).get('/'));
    assertWithinThreshold(stats, THRESHOLDS.root, 'GET /');
  });

  test('GET /stations respon dins del llindar (màx i p95)', async () => {
    const stats = await measureSeries(() => request(app).get('/stations'));
    assertWithinThreshold(stats, THRESHOLDS.stations, 'GET /stations');
  });

  test('GET /stations/search respon dins del llindar (màx i p95)', async () => {
    const stats = await measureSeries(() =>
      request(app).get('/stations/search').query({ q: 'barcelona' })
    );
    assertWithinThreshold(stats, THRESHOLDS.stationsSearch, 'GET /stations/search');
  });

  // Geocode depèn de GOOGLE_MAPS_API_KEY; si no hi és, el test es salta.
  const hasGeocodeKey = Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
  (hasGeocodeKey ? test : test.skip)(
    'GET /geocode/autocomplete respon dins del llindar si hi ha clau de mapes',
    async () => {
      const stats = await measureSeries(() =>
        request(app).get('/geocode/autocomplete').query({ input: 'barcelona' })
      );
      assertWithinThreshold(stats, THRESHOLDS.geocodeAutocomplete, 'geocode autocomplete');
    }
  );
});
