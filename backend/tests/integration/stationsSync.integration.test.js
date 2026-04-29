const request = require('supertest');

jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('Stations sync integration (axios mocked)', () => {
  const syncExternalId = 'SYNC-EXT-99999';

  beforeAll(async () => {
    // Limpiamos por si existiese una ejecución anterior
    await pool.query('DELETE FROM ego.estaciones WHERE external_id = $1', [syncExternalId]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ego.estaciones WHERE external_id = $1', [syncExternalId]);
    await pool.end();
  });

  test('GET /stations/sync sincroniza y devuelve totalProcesados', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          // stationModel.upsertStation usa est.id como external_id
          id: syncExternalId,
          promotor_gestor: 'test',
          acces: 'acces',
          tipus_velocitat: 'tipus_velocitat',
          tipus_connexi: 'CCS2',
          latitud: 41.4,
          longitud: 2.17,
          designaci_descriptiva: 'Estación Sync Test',
          kw: 50,
          ac_dc: 'DC',
          adre_a: 'Carrer Test',
          municipi: 'TestCity',
          provincia: 'TestProv',
        },
      ],
    });

    const res = await request(app).get('/stations/sync');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mensaje).toBe('Sincronización procesada');
    expect(res.body.totalProcesados).toBe(1);

    // Validamos que el upsert realmente tocó la DB
    const dbRes = await pool.query('SELECT * FROM ego.estaciones WHERE external_id = $1', [syncExternalId]);
    expect(dbRes.rows.length).toBe(1);
  });
});

