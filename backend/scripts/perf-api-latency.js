/**
 * Mesura de latència d'endpoints clau (validació Performance Efficiency — time behaviour).
 *
 * Ús (backend en marxa, p. ex. http://localhost:3000):
 *   node scripts/perf-api-latency.js
 *   API_BASE=http://192.168.1.10:3000 ITERATIONS=20 node scripts/perf-api-latency.js
 *
 * Sortida: mitjana, p95, màxim (ms) per endpoint. Enganxeu la taula a la memòria.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = (process.env.API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const ITERATIONS = Math.max(5, Number(process.env.ITERATIONS) || 15);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 10);

const SCENARIOS = [
  { name: 'GET / (health + DB)', path: '/' },
  { name: 'GET /stations', path: '/stations' },
  { name: 'GET /stations/search', path: '/stations/search?q=barcelona' },
  { name: 'GET /geocode/autocomplete', path: '/geocode/autocomplete?input=barcelona' },
  { name: 'GET /ranking', path: '/ranking' },
];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function measureOnce(url) {
  const start = performance.now();
  const res = await fetch(url);
  await res.text();
  const ms = performance.now() - start;
  return { ms, ok: res.ok, status: res.status };
}

async function runSeries(label, url, n) {
  const samples = [];
  let failures = 0;
  for (let i = 0; i < n; i++) {
    try {
      const { ms, ok } = await measureOnce(url);
      samples.push(ms);
      if (!ok) failures += 1;
    } catch {
      failures += 1;
    }
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    label,
    url,
    n,
    failures,
    avg: samples.length ? Math.round(sum / samples.length) : null,
    p95: samples.length ? Math.round(percentile(samples, 95)) : null,
    max: samples.length ? Math.round(samples[samples.length - 1]) : null,
    min: samples.length ? Math.round(samples[0]) : null,
  };
}

/** Prova concurrent: N peticions alhora (capacity / throughput orientatiu). */
async function runConcurrent(label, url, n) {
  const started = performance.now();
  const results = await Promise.all(
    Array.from({ length: n }, () =>
      measureOnce(url).catch(() => ({ ms: null, ok: false, status: 0 }))
    )
  );
  const totalMs = performance.now() - started;
  const okCount = results.filter((r) => r.ok).length;
  return {
    label: `${label} (concurrent x${n})`,
    url,
    n,
    failures: n - okCount,
    avg: Math.round(totalMs),
    p95: null,
    max: Math.round(totalMs),
    min: Math.round(totalMs),
    note: `Wall ${Math.round(totalMs)} ms, ${okCount}/${n} OK`,
  };
}

async function main() {
  console.log('e-Go — mesura de latència API');
  console.log(`Base: ${API_BASE}  |  iteracions: ${ITERATIONS}  |  concurrencia: ${CONCURRENCY}`);
  console.log('');

  const rows = [];
  for (const s of SCENARIOS) {
    const url = `${API_BASE}${s.path}`;
    rows.push(await runSeries(s.name, url, ITERATIONS));
  }
  rows.push(await runConcurrent('GET /stations', `${API_BASE}/stations`, CONCURRENCY));

  console.log('| Escenari | n | Fallades | Mitjana (ms) | p95 (ms) | Màx (ms) |');
  console.log('|----------|---|----------|--------------|----------|----------|');
  for (const r of rows) {
    const avg = r.avg ?? '—';
    const p95 = r.p95 ?? (r.note ? r.note : '—');
    const max = r.max ?? '—';
    console.log(`| ${r.label} | ${r.n} | ${r.failures} | ${avg} | ${p95} | ${max} |`);
  }

  console.log('\nDefiniu llindars a la memòria (exemple) i compareu:');
  console.log('  - GET /stations: p95 < 2000 ms');
  console.log('  - GET / (health): p95 < 500 ms');
  console.log('  - Concurrent: 0 fallades amb CONCURRENCY=10');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
