/**
 * Llindars de temps (ms) alineats amb els criteris d'acceptació de la memòria.
 * PERF_CI_RELAX=2 amplia els límits a CI (màquines més lentes).
 */
const RELAX = Number(process.env.PERF_CI_RELAX) || (process.env.CI === 'true' ? 2 : 1);

function scale(ms) {
  return Math.round(ms * RELAX);
}

const THRESHOLDS = {
  root: { max: scale(500), p95: scale(400) },
  stations: { max: scale(2500), p95: scale(2000) },
  stationsSearch: { max: scale(2500), p95: scale(2000) },
  geocodeAutocomplete: { max: scale(3500), p95: scale(3000) },
  concurrentStationsWall: scale(5000),
};

const DEFAULT_ITERATIONS = Math.max(5, Number(process.env.PERF_ITERATIONS) || 10);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Executa `fn` n vegades i retorna estadístiques de latència (ms).
 * `fn` ha de retornar { status } (p. ex. resposta de supertest).
 * Les iteracions de `warmup` no compten (eviten falsos negatius per arrencada freda).
 */
async function measureSeries(fn, options = {}) {
  const iterations =
    typeof options === 'number' ? options : (options.iterations ?? DEFAULT_ITERATIONS);
  const warmup = typeof options === 'number' ? 2 : (options.warmup ?? 2);

  let lastStatus = 0;
  for (let i = 0; i < warmup; i++) {
    const res = await fn();
    lastStatus = res.status;
  }

  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const res = await fn();
    samples.push(performance.now() - start);
    lastStatus = res.status;
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    iterations: samples.length,
    avg: Math.round(sum / samples.length),
    p95: Math.round(percentile(samples, 95)),
    max: Math.round(samples[samples.length - 1]),
    min: Math.round(samples[0]),
    lastStatus,
  };
}

function assertWithinThreshold(stats, limits, label) {
  expect(stats.lastStatus).toBeGreaterThanOrEqual(200);
  expect(stats.lastStatus).toBeLessThan(300);
  expect(stats.max).toBeLessThanOrEqual(limits.max);
  expect(stats.p95).toBeLessThanOrEqual(limits.p95);
}

module.exports = {
  THRESHOLDS,
  DEFAULT_ITERATIONS,
  measureSeries,
  assertWithinThreshold,
  percentile,
};
