const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');

describe('Incidencias integration (real DB)', () => {
  // Creamos ids altos de prueba que no puedan ser conflictivos con datos reales.
  const validUserId = 99100001;
  const validStationId = 99100002;
  const missingConductorUserId = 99100003;
  const missingStationId = 99919999;
  const testCommentPrefix = 'INT-INCIDENCIA-TEST';

  beforeAll(async () => {
    //Eliminamos elementos de prueba anteriores
    await pool.query('DELETE FROM ego.incidencia WHERE conductor IN ($1, $2)', [validUserId, missingConductorUserId]);
    await pool.query('DELETE FROM ego.conductor WHERE user_id IN ($1, $2)', [validUserId, missingConductorUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [validStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id IN ($1, $2)', [validUserId, missingConductorUserId]);

    //
    await pool.query(
      `
      INSERT INTO ego.usuari (id, email, username)
      VALUES ($1, $2, $3)
      `,
      [validUserId, 'integration-incidencia@test.com', `incidencia-user-${validUserId}`]
    );
    await pool.query(
      `
      INSERT INTO ego.conductor (user_id)
      VALUES ($1)
      `,
      [validUserId]
    );

    // Existe usuario pero no es conductor
    await pool.query(
      `
      INSERT INTO ego.usuari (id, email, username)
      VALUES ($1, $2, $3)
      `,
      [missingConductorUserId, 'integration-no-conductor@test.com', `incidencia-user-${missingConductorUserId}`]
    );

    // Creamos una estación de prueba
    await pool.query(
      `
      INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual)
      VALUES ($1, 'TEST-INC-99100002', 'Estación Test Incidencias', 41.38, 2.16, 50, true)
      `,
      [validStationId]
    );
  });

  afterAll(async () => {
    // Eliminamos elementos de prueba
    await pool.query('DELETE FROM ego.incidencia WHERE conductor IN ($1, $2)', [validUserId, missingConductorUserId]);
    await pool.query('DELETE FROM ego.conductor WHERE user_id IN ($1, $2)', [validUserId, missingConductorUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [validStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id IN ($1, $2)', [validUserId, missingConductorUserId]);
    await pool.end();
  });

  test('GET /incidencias/types devuelve los tipos del enum', async () => {
    // OK
    const res = await request(app).get('/incidencias/types');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body).toContain('Operatiu');
  });

  test('POST /incidencias crea incidencia válida sin archivo (201)', async () => {
    const res = await request(app).post('/incidencias').field('comentari', `${testCommentPrefix}-ok`).field('tipus', 'Operatiu').field('conductor', String(validUserId)).field('estacio', String(validStationId));

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        tipus: 'Operatiu',
        comentari: `${testCommentPrefix}-ok`,
        conductor: validUserId,
        estacio: validStationId,
        validada: false,
        resolta: false,
      })
    );
  });

  test('POST /incidencias devuelve 400 si falta comentario', async () => {
    // Validación de campos obligatorios.
    const res = await request(app).post('/incidencias').field('comentari', '').field('tipus', 'Operatiu').field('conductor', String(validUserId)).field('estacio', String(validStationId));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El comentario es obligatorio');
  });

  test('POST /incidencias devuelve 400 si falta tipo', async () => {
    // Validación de campos obligatorios.
    const res = await request(app).post('/incidencias').field('comentari', `${testCommentPrefix}-sin-tipo`).field('tipus', '').field('conductor', String(validUserId)).field('estacio', String(validStationId));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El tipo es obligatorio');
  });

  test('POST /incidencias devuelve 404 si conductor no existe', async () => {
    // No existe el conductor en la base de datos.
    const res = await request(app).post('/incidencias').field('comentari', `${testCommentPrefix}-no-conductor`).field('tipus', 'Operatiu').field('conductor', String(missingConductorUserId)).field('estacio', String(validStationId));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('El conductor no existe');
  });

  test('POST /incidencias devuelve 404 si estación no existe', async () => {
    // No existe la estación en la base de datos.
    const res = await request(app).post('/incidencias').field('comentari', `${testCommentPrefix}-no-station`).field('tipus', 'Operatiu').field('conductor', String(validUserId)).field('estacio', String(missingStationId));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('La estación no existe');
  });

  describe('flujo incidencia solucionada', () => {
    test('POST /incidencias crea incidencia solucionada con payload esperado (201)', async () => {
      // se crea la incidencia solucionada correctamente
      const solvedComment = 'La Incidencia está solucionada';
      const res = await request(app)
        .post('/incidencias')
        .field('comentari', solvedComment)
        .field('tipus', 'Operatiu')
        .field('conductor', String(validUserId))
        .field('estacio', String(validStationId));

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          comentari: solvedComment,
          tipus: 'Operatiu',
          conductor: validUserId,
          estacio: validStationId,
          arxiu: null,
          validada: false,
          resolta: false,
        })
      );
    });

    test('POST /incidencias persistencia DB: guarda incidencia solucionada con defaults', async () => {
      // se guarda la incidencia solucionada correctamente
      const solvedComment = `La Incidencia está solucionada - ${Date.now()}`;
      const createRes = await request(app)
        .post('/incidencias')
        .field('comentari', solvedComment)
        .field('tipus', 'Operatiu')
        .field('conductor', String(validUserId))
        .field('estacio', String(validStationId));

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBeDefined();

      const dbRes = await pool.query(
        'SELECT id, tipus, comentari, conductor, estacio, validada, resolta, datainici, arxiu FROM ego.incidencia WHERE id = $1',
        [createRes.body.id]
      );

      expect(dbRes.rows).toHaveLength(1);
      expect(dbRes.rows[0]).toEqual(
        expect.objectContaining({
          id: createRes.body.id,
          tipus: 'Operatiu',
          comentari: solvedComment,
          conductor: validUserId,
          estacio: validStationId,
          validada: false,
          resolta: false,
          arxiu: null,
        })
      );
      expect(dbRes.rows[0].datainici).toBeTruthy();
    });

    test('POST /incidencias devuelve 400 si llega tipus "operatiu" en minúscula', async () => {
      // testeo de validación de entrada case-sensitive
      const res = await request(app)
        .post('/incidencias')
        .field('comentari', 'La Incidencia está solucionada')
        .field('tipus', 'operatiu')
        .field('conductor', String(validUserId))
        .field('estacio', String(validStationId));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El tipo seleccionado no es válido');
    });
  });

});
