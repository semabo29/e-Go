const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('DB integration', () => {
  //asignamos id y nombre de la prueba
  const testUserId = 900001;
  const emptyUserId = 900002;
  const missingUserId = 909999;
  const carName = 'Integration Car';

  beforeAll(async () => {
    //borramos de pruebas anteriores
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    //añadimos usuario para la prueba
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username)
       VALUES ($1, $2, $3)`,
      [testUserId, 'integration-car@test.com', `integration-user-${testUserId}`]
    );
    //asignamos usuario para ser conductor
    await pool.query(
      `INSERT INTO ego.conductor (user_id)
       VALUES ($1)`,
      [testUserId]
    );
    //usuario válido sin vehículos para comprobar lista vacía
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [emptyUserId]);
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username)
       VALUES ($1, $2, $3)`,
      [emptyUserId, 'integration-empty@test.com', `integration-user-${emptyUserId}`]
    );
    await pool.query(
      `INSERT INTO ego.conductor (user_id)
       VALUES ($1)`,
      [emptyUserId]
    );
  });

  afterAll(async () => {
    //eliminamos usuario creado en el test
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [emptyUserId]);
    await pool.end();
  });

  test('POST /car creates vehicle', async () => {
    const res = await request(app).post('/car').send({
      usuari_id: testUserId,
      v_nom: carName,
      v_potencia: 120,
      v_corrent: 'AC',
      v_conector: 'CCS',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /car returns created vehicle', async () => {
    const res = await request(app).get('/car').query({ usuari_id: testUserId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const vehicle = res.body.find((item) => item.nom === carName && item.usuari_id === testUserId);
    expect(vehicle).toBeDefined();
  });

  test('GET /car returns empty array for user with no vehicles', async () => {
    const res = await request(app).get('/car').query({ usuari_id: emptyUserId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  test('GET /car fails when usuari_id is missing', async () => {
    const res = await request(app).get('/car');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al obtenir vehicles');
  });

  test('POST /car fails when required fields are missing', async () => {
    const res = await request(app).post('/car').send({
      usuari_id: testUserId,
      v_nom: 'Incomplete Car',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al processar la solicitud');
  });

  test('POST /car fails for non-existent user id', async () => {
    const res = await request(app).post('/car').send({
      usuari_id: missingUserId,
      v_nom: 'Ghost User Car',
      v_potencia: 90,
      v_corrent: 'AC',
      v_conector: 'CCS',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al processar la solicitud');
  });

  test('DELETE /car deletes vehicle', async () => {
    const res = await request(app).delete('/car').send({
      usuari_id: testUserId,
      v_nom: carName,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /car returns success even if vehicle does not exist', async () => {
    const res = await request(app).delete('/car').send({
      usuari_id: testUserId,
      v_nom: 'Vehicle That Does Not Exist',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /car fails when required fields are missing', async () => {
    const res = await request(app).delete('/car').send({
      usuari_id: testUserId,
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al processar la solicitud');
  });

  test('POST -> GET -> DELETE -> GET keeps state consistent', async () => {
    const lifecycleCarName = 'Lifecycle Car';

    const createRes = await request(app).post('/car').send({
      usuari_id: testUserId,
      v_nom: lifecycleCarName,
      v_potencia: 80,
      v_corrent: 'AC',
      v_conector: 'Type2',
    });
    expect(createRes.status).toBe(201);

    const listAfterCreate = await request(app).get('/car').query({ usuari_id: testUserId });
    expect(listAfterCreate.status).toBe(200);
    expect(
      listAfterCreate.body.some((item) => item.nom === lifecycleCarName && item.usuari_id === testUserId)
    ).toBe(true);

    const deleteRes = await request(app).delete('/car').send({
      usuari_id: testUserId,
      v_nom: lifecycleCarName,
    });
    expect(deleteRes.status).toBe(200);

    const listAfterDelete = await request(app).get('/car').query({ usuari_id: testUserId });
    expect(listAfterDelete.status).toBe(200);
    expect(
      listAfterDelete.body.some((item) => item.nom === lifecycleCarName && item.usuari_id === testUserId)
    ).toBe(false);
  });
});
