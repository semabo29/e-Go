/**
 * Proves de capacitat (concurrencia moderada) — complement de time behaviour.
 * RUN_PERF_TESTS=true i PostgreSQL operatiu.
 */
const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');
const { THRESHOLDS } = require('../../lib/perfMetrics');

const runPerf = process.env.RUN_PERF_TESTS === 'true';
const describePerf = runPerf ? describe : describe.skip;

const CONCURRENT = Math.max(2, Number(process.env.PERF_CONCURRENCY) || 10);

describePerf('Capacitat — concurrencia API (performance)', () => {
  afterAll(async () => {
    await pool.end();
  });

  test(`${CONCURRENT} peticions simultànies a GET /stations compleixen en temps i sense errors`, async () => {
    const started = performance.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () => request(app).get('/stations'))
    );
    const wallMs = performance.now() - started;

    const okCount = results.filter((r) => r.status === 200).length;
    expect(okCount).toBe(CONCURRENT);
    expect(wallMs).toBeLessThanOrEqual(THRESHOLDS.concurrentStationsWall);
  });
});
