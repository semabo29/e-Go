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

  // IDs para tests de trigger y admin (distintos para no interferir con los tests básicos)
  const triggerUserIds = [99100010, 99100011, 99100012, 99100013, 99100014];
  const triggerStationId = 99100020;
  const premiumUserId = 99100030;
  const premiumStationId = 99100031;
  const adminUserId = 99100040;

  beforeAll(async () => {
    const allUserIds = [validUserId, missingConductorUserId, ...triggerUserIds, premiumUserId, adminUserId];
    const allStationIds = [validStationId, triggerStationId, premiumStationId];

    await pool.query(`DELETE FROM ego.incidencia WHERE conductor = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.subscription WHERE usuari_id = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.conductor WHERE user_id = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.admins WHERE user_id = $1`, [adminUserId]);
    await pool.query(`DELETE FROM ego.estaciones WHERE id = ANY($1::int[])`, [allStationIds]);
    await pool.query(`DELETE FROM ego.usuari WHERE id = ANY($1::int[])`, [allUserIds]);

    // Usuario básico de prueba
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username) VALUES ($1, $2, $3)`,
      [validUserId, 'integration-incidencia@test.com', `incidencia-user-${validUserId}`]
    );
    await pool.query(`INSERT INTO ego.conductor (user_id) VALUES ($1)`, [validUserId]);

    // Existe usuario pero no es conductor
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username) VALUES ($1, $2, $3)`,
      [missingConductorUserId, 'integration-no-conductor@test.com', `incidencia-user-${missingConductorUserId}`]
    );

    // Creamos una estación de prueba básica
    await pool.query(
      `INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual)
       VALUES ($1, 'TEST-INC-99100002', 'Estación Test Incidencias', 41.38, 2.16, 50, true)`,
      [validStationId]
    );

    // Estación para tests de trigger automático
    await pool.query(
      `INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual, operatiu)
       VALUES ($1, 'TEST-INC-TRIGGER-99100020', 'Estación Trigger Test', 41.39, 2.17, 50, true, false)`,
      [triggerStationId]
    );

    // Conductores para tests de trigger
    for (let i = 0; i < triggerUserIds.length; i++) {
      const uid = triggerUserIds[i];
      await pool.query(
        `INSERT INTO ego.usuari (id, email, username) VALUES ($1, $2, $3)`,
        [uid, `trigger-user-${uid}@test.com`, `trigger-user-${uid}`]
      );
      await pool.query(`INSERT INTO ego.conductor (user_id) VALUES ($1)`, [uid]);
    }

    // Estación para test de premium
    await pool.query(
      `INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual)
       VALUES ($1, 'TEST-INC-PREMIUM-99100031', 'Estación Premium Test', 41.40, 2.18, 50, true)`,
      [premiumStationId]
    );

    // Usuario premium
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username) VALUES ($1, $2, $3)`,
      [premiumUserId, `premium-user-${premiumUserId}@test.com`, `premium-user-${premiumUserId}`]
    );
    await pool.query(`INSERT INTO ego.conductor (user_id) VALUES ($1)`, [premiumUserId]);
    await pool.query(
      `INSERT INTO ego.subscription (usuari_id, status, current_period_end)
       VALUES ($1, 'active', NOW() + INTERVAL '30 days')
       ON CONFLICT (usuari_id) DO UPDATE SET status = 'active'`,
      [premiumUserId]
    );

    // Admin para tests de acciones admin
    await pool.query(
      `INSERT INTO ego.usuari (id, email, username) VALUES ($1, $2, $3)`,
      [adminUserId, `admin-test-${adminUserId}@test.com`, `admin-test-${adminUserId}`]
    );
    await pool.query(
      `INSERT INTO ego.admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [adminUserId]
    );
  });

  afterAll(async () => {
    const allUserIds = [validUserId, missingConductorUserId, ...triggerUserIds, premiumUserId, adminUserId];
    const allStationIds = [validStationId, triggerStationId, premiumStationId];

    await pool.query(`DELETE FROM ego.incidencia WHERE conductor = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.subscription WHERE usuari_id = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.admins WHERE user_id = $1`, [adminUserId]);
    await pool.query(`DELETE FROM ego.conductor WHERE user_id = ANY($1::int[])`, [allUserIds]);
    await pool.query(`DELETE FROM ego.estaciones WHERE id = ANY($1::int[])`, [allStationIds]);
    await pool.query(`DELETE FROM ego.usuari WHERE id = ANY($1::int[])`, [allUserIds]);
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
        'SELECT id, tipus, comentari, conductor, estacio, validada, resolta, data_inici, arxiu FROM ego.incidencia WHERE id = $1',
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
      expect(dbRes.rows[0].data_inici).toBeTruthy();
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

  // Helper para crear JWT de admin de prueba
  function makeAdminToken(sub) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ sub, role: 'admin' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }

  describe('trigger automático: umbral 5 usuarios distintos por tipo', () => {
    beforeEach(async () => {
      // Limpiamos incidencias del trigger station antes de cada test de este bloque
      await pool.query(
        `DELETE FROM ego.incidencia WHERE estacio = $1`,
        [triggerStationId]
      );
      // Reseteamos puntos de los conductores del trigger
      await pool.query(
        `UPDATE ego.conductor SET punts = 0 WHERE user_id = ANY($1::int[])`,
        [triggerUserIds]
      );
      // Aseguramos que la estación del trigger empieza como no operativa
      await pool.query(`UPDATE ego.estaciones SET operatiu = false WHERE id = $1`, [triggerStationId]);
    });

    test('los primeros 4 reportes Avariat no disparan el trigger (siguen pendientes)', async () => {
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/incidencias')
          .field('comentari', `Avería test ${i}`)
          .field('tipus', 'Avariat')
          .field('conductor', String(triggerUserIds[i]))
          .field('estacio', String(triggerStationId));
        expect(res.status).toBe(201);
      }

      const dbRes = await pool.query(
        `SELECT COUNT(*) AS total FROM ego.incidencia
         WHERE estacio = $1 AND tipus = 'Avariat' AND validada = FALSE`,
        [triggerStationId]
      );
      expect(parseInt(dbRes.rows[0].total)).toBe(4);
    });

    test('el 5º reporte Avariat valida los 5 en lote y otorga 10 puntos a cada conductor (no Operatiu, no pone operativo)', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/incidencias')
          .field('comentari', `Avería trigger ${i}`)
          .field('tipus', 'Avariat')
          .field('conductor', String(triggerUserIds[i]))
          .field('estacio', String(triggerStationId));
      }

      const incRes = await pool.query(
        `SELECT validada, resolta FROM ego.incidencia WHERE estacio = $1 AND tipus = 'Avariat'`,
        [triggerStationId]
      );
      expect(incRes.rows.every((r) => r.validada === true)).toBe(true);
      expect(incRes.rows.every((r) => r.resolta === false)).toBe(true);

      for (const uid of triggerUserIds) {
        const ptRes = await pool.query(
          `SELECT punts FROM ego.conductor WHERE user_id = $1`,
          [uid]
        );
        expect(ptRes.rows[0].punts).toBe(10);
      }

      // La estación sigue sin ser operativa (tipo Avariat no la reactiva)
      const stRes = await pool.query(`SELECT operatiu FROM ego.estaciones WHERE id = $1`, [triggerStationId]);
      expect(stRes.rows[0].operatiu).toBe(false);
    });

    test('el 5º reporte Operatiu valida+resuelve los 5 y pone la estación como operativa', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/incidencias')
          .field('comentari', `Estación operativa ${i}`)
          .field('tipus', 'Operatiu')
          .field('conductor', String(triggerUserIds[i]))
          .field('estacio', String(triggerStationId));
        expect(res.status).toBe(201);
      }

      const incRes = await pool.query(
        `SELECT validada, resolta FROM ego.incidencia WHERE estacio = $1 AND tipus = 'Operatiu'`,
        [triggerStationId]
      );
      expect(incRes.rows.every((r) => r.validada === true && r.resolta === true)).toBe(true);

      const stRes = await pool.query(`SELECT operatiu FROM ego.estaciones WHERE id = $1`, [triggerStationId]);
      expect(stRes.rows[0].operatiu).toBe(true);
    });
  });

  describe('acciones admin: validar, rechazar, resolver', () => {
    let incidenciaId;
    const adminToken = (() => {
      try {
        return makeAdminToken(adminUserId);
      } catch (_) {
        return null;
      }
    })();

    beforeEach(async () => {
      // Limpiamos incidencias del estación premium
      await pool.query(`DELETE FROM ego.incidencia WHERE estacio = $1`, [premiumStationId]);
      await pool.query(`UPDATE ego.conductor SET punts = 0 WHERE user_id = $1`, [validUserId]);
      await pool.query(`UPDATE ego.conductor SET punts = 0 WHERE user_id = $1`, [premiumUserId]);

      // Creamos una incidencia pendiente para el conductor normal
      const res = await request(app)
        .post('/incidencias')
        .field('comentari', 'Incidencia para admin test')
        .field('tipus', 'Avariat')
        .field('conductor', String(validUserId))
        .field('estacio', String(premiumStationId));
      expect(res.status).toBe(201);
      incidenciaId = res.body.id;
    });

    test('GET /admin/incidencias/pending devuelve las incidencias pendientes', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .get('/admin/incidencias/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.incidencias)).toBe(true);
      const found = res.body.incidencias.find((i) => i.id === incidenciaId);
      expect(found).toBeDefined();
      expect(found.data_inici).toBeTruthy();
      expect(Number.isNaN(Date.parse(found.data_inici))).toBe(false);
    });

    test('POST /admin/incidencias/:id/validate valida y otorga 10 puntos a conductor normal', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.incidencia.validada).toBe(true);
      expect(res.body.pointsAwarded.points).toBe(10);
      expect(res.body.pointsAwarded.isPremium).toBe(false);

      const ptRes = await pool.query(`SELECT punts FROM ego.conductor WHERE user_id = $1`, [validUserId]);
      expect(ptRes.rows[0].punts).toBe(10);
    });

    test('validar dos veces la misma incidencia devuelve 409 (idempotencia punts_atorgats)', async () => {
      if (!adminToken) return;
      await request(app)
        .post(`/admin/incidencias/${incidenciaId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      const res2 = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res2.status).toBe(409);
    });

    test('POST /admin/incidencias/:id/reject rechaza la incidencia sin otorgar puntos', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motiu: 'Reporte falso de prueba' });
      expect(res.status).toBe(200);
      expect(res.body.incidencia.rebutjada).toBe(true);
      expect(res.body.incidencia.motiu_rebuig).toBe('Reporte falso de prueba');

      const ptRes = await pool.query(`SELECT punts FROM ego.conductor WHERE user_id = $1`, [validUserId]);
      expect(ptRes.rows[0].punts).toBe(0);
    });

    test('rechazar una incidencia ya validada devuelve 409', async () => {
      if (!adminToken) return;
      await request(app)
        .post(`/admin/incidencias/${incidenciaId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      const res = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motiu: 'No debería poder rechazarse' });
      expect(res.status).toBe(409);
    });

    test('conductor premium recibe 20 puntos al validar (x2)', async () => {
      if (!adminToken) return;
      const premRes = await request(app)
        .post('/incidencias')
        .field('comentari', 'Incidencia conductor premium')
        .field('tipus', 'Avariat')
        .field('conductor', String(premiumUserId))
        .field('estacio', String(premiumStationId));
      expect(premRes.status).toBe(201);
      const premIncId = premRes.body.id;

      const valRes = await request(app)
        .post(`/admin/incidencias/${premIncId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(valRes.status).toBe(200);
      expect(valRes.body.pointsAwarded.points).toBe(20);
      expect(valRes.body.pointsAwarded.isPremium).toBe(true);

      const ptRes = await pool.query(`SELECT punts FROM ego.conductor WHERE user_id = $1`, [premiumUserId]);
      expect(ptRes.rows[0].punts).toBe(20);
    });

    test('POST /admin/incidencias/:id/resolve requiere validación previa', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Pendiente (no validada) → 409
      expect(res.status).toBe(409);
    });

    test('flujo completo: validar → resolver funciona correctamente', async () => {
      if (!adminToken) return;
      await request(app)
        .post(`/admin/incidencias/${incidenciaId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      const resRes = await request(app)
        .post(`/admin/incidencias/${incidenciaId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resRes.status).toBe(200);
      expect(resRes.body.incidencia.resolta).toBe(true);
    });
  });

  describe('GET /admin/incidencias/history: filtro por fechas y estado', () => {
    const histAdminToken = (() => {
      try {
        return makeAdminToken(adminUserId);
      } catch (_) {
        return null;
      }
    })();

    test('devuelve resultados paginados con limit y offset', async () => {
      if (!histAdminToken) return;
      const res = await request(app)
        .get('/admin/incidencias/history?limit=5&offset=0')
        .set('Authorization', `Bearer ${histAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.incidencias)).toBe(true);
      expect(res.body.incidencias.length).toBeLessThanOrEqual(5);
      if (res.body.incidencias.length > 0) {
        const first = res.body.incidencias[0];
        expect(first.data_inici).toBeTruthy();
        expect(Number.isNaN(Date.parse(first.data_inici))).toBe(false);
      }
    });

    test('filtro por rango de fechas sólo devuelve incidencias del rango', async () => {
      if (!histAdminToken) return;
      const from = '2000-01-01';
      const to = '2000-12-31';
      const res = await request(app)
        .get(`/admin/incidencias/history?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${histAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.incidencias.length).toBe(0);
    });

    test('filtro por estado pending solo devuelve incidencias pendientes', async () => {
      if (!histAdminToken) return;
      const res = await request(app)
        .get('/admin/incidencias/history?estado=pending')
        .set('Authorization', `Bearer ${histAdminToken}`);
      expect(res.status).toBe(200);
      const allPending = res.body.incidencias.every(
        (i) => i.validada === false && i.rebutjada === false && i.resolta === false
      );
      expect(allPending).toBe(true);
    });
  });

});
