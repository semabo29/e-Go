const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('Favorites integration (real DB)', () => {
  // IDs altos para evitar colisiones
  const testUserId = 99999;
  const emptyUserId = 99998;
  const testStationId = 88888;
  const testStationName = 'Estación Test Favoritos';

  beforeAll(async () => {
    // Preparación: limpiamos y creamos usuario + estación de prueba
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);

    await pool.query(
      `
      INSERT INTO ego.usuari (id, email, username)
      VALUES ($1, 'test_preferits@test.com', 'usuariotest99')
      `,
      [testUserId]
    );

    await pool.query(
      `
      INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual)
      VALUES ($1, 'TEST-EXT-888', $2, 41.38, 2.16, 50, true)
      `,
      [testStationId, testStationName]
    );
  });

  afterAll(async () => {
    // Limpieza
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [emptyUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    await pool.end();
  });

  test('POST /favorites crea un favorito (201)', async () => {
    // Añade un favorito a partir de usuari_id + estacio_id
    const res = await request(app).post('/favorites').send({
      usuari_id: testUserId,
      estacio_id: testStationId,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Estació afegida a preferits');
  });

  test('GET /favorites retorna [] si el usuario no té preferits', async () => {
    // Asegura que no existe cap favorito previo para este usuari
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [emptyUserId]);

    const res = await request(app).get('/favorites').query({ usuari_id: emptyUserId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /favorites devuelve el favorito del usuario (200)', async () => {
    // Lista los favoritos guardados para el usuario
    const res = await request(app).get('/favorites').query({ usuari_id: testUserId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const estacionEncontrada = res.body.find((est) => est.id === testStationId);
    expect(estacionEncontrada).toBeDefined();
    expect(estacionEncontrada.nom).toBe(testStationName);
  });

  test('POST /favorites falla si faltan datos (500)', async () => {
    // Asegura que el servicio valida la presencia de IDs
    const res = await request(app).post('/favorites').send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al procesar la solicitud');
  });

  test('DELETE /favorites elimina el favorito y lo borra de la DB (200)', async () => {
    // Elimina el favorito y valida que no queda ninguna fila en la tabla
    const res = await request(app).delete('/favorites').send({
      usuari_id: testUserId,
      estacio_id: testStationId,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Estació eliminada de preferits');

    const checkDb = await pool.query(
      'SELECT * FROM ego.favorits WHERE usuari_id = $1 AND estacio_id = $2',
      [testUserId, testStationId]
    );
    expect(checkDb.rows.length).toBe(0);
  });
});

