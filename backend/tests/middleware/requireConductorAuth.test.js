const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const userModel = require('../../models/userModel');
const {
  requireConductorAuth,
  requireSelfUserId,
  requireSelfAsFriendActor,
  getUserIdFromPayload,
  assertSelfUserId,
} = require('../../middleware/requireConductorAuth');
const { conductorAuthHeader, signConductorToken } = require('../helpers/conductorAuth');

function buildApp(extraRoutes) {
  const app = express();
  app.use(express.json());
  app.get('/me', requireConductorAuth, (req, res) =>
    res.json({ authUserId: req.authUserId, user: req.user })
  );
  app.get(
    '/self-query',
    requireConductorAuth,
    requireSelfUserId({ from: 'query', field: 'usuari_id' }),
    (req, res) => res.json({ ok: true })
  );
  app.post(
    '/self-body',
    requireConductorAuth,
    requireSelfUserId({ from: 'body', field: 'usuari_id' }),
    (req, res) => res.json({ ok: true })
  );
  app.get(
    '/self-params/:usuari_id',
    requireConductorAuth,
    requireSelfUserId({ from: 'params', field: 'usuari_id' }),
    (req, res) => res.json({ ok: true })
  );
  app.post(
    '/self-mixed',
    requireConductorAuth,
    requireSelfUserId({ from: 'bodyOrQuery', field: 'usuari_id' }),
    (req, res) => res.json({ ok: true })
  );
  app.post(
    '/friend',
    requireConductorAuth,
    requireSelfAsFriendActor,
    (req, res) => res.json({ ok: true })
  );
  if (extraRoutes) extraRoutes(app);
  return app;
}

const app = buildApp();

describe('getUserIdFromPayload', () => {
  test('lee id o sub numerico positivo', () => {
    expect(getUserIdFromPayload({ id: 7 })).toBe(7);
    expect(getUserIdFromPayload({ sub: '12' })).toBe(12);
    expect(getUserIdFromPayload({ id: 0 })).toBeNull();
    expect(getUserIdFromPayload({ sub: 'x' })).toBeNull();
    expect(getUserIdFromPayload(null)).toBeNull();
  });
});

describe('assertSelfUserId', () => {
  test('responde 400 si el id no es valido', () => {
    const req = { authUserId: 7 };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    expect(assertSelfUserId(req, res, 'abc')).toBe(false);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('requireConductorAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 7, is_banned: false });
  });

  test('-> 401 sin Authorization', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Falta token de autorizacion');
  });

  test('-> 401 si el esquema no es Bearer', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  test('-> 401 si falta token tras Bearer', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  test('-> 500 si JWT_SECRET no está configurado', async () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ id: 7 }, 'other-secret');
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('JWT_SECRET no configurado');
  });

  test('-> 401 con token inválido', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido o expirado');
  });

  test('-> 401 si el payload no tiene id valido', async () => {
    const token = jwt.sign({ sub: 'invalid' }, process.env.JWT_SECRET);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('-> 401 si el usuario no existe', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue(null);
    const res = await request(app).get('/me').set(conductorAuthHeader(7));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Usuario no encontrado');
  });

  test('-> 403 si usuario baneado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({
      id: 7,
      is_banned: true,
      banned_reason: 'spam',
    });
    const res = await request(app).get('/me').set(conductorAuthHeader(7));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('USER_BANNED');
    expect(res.body.banned_reason).toBe('spam');
  });

  test('-> 200 con token de conductor valido (id)', async () => {
    const res = await request(app).get('/me').set(conductorAuthHeader(7));
    expect(res.status).toBe(200);
    expect(res.body.authUserId).toBe(7);
  });

  test('-> 200 con token que usa sub en lugar de id', async () => {
    const token = jwt.sign({ sub: 9, role: 'conductor' }, process.env.JWT_SECRET);
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 9, is_banned: false });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authUserId).toBe(9);
  });

  test('requireSelfUserId query -> 400 si falta usuari_id', async () => {
    const res = await request(app).get('/self-query').set(conductorAuthHeader(7));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('usuari_id es requerido');
  });

  test('requireSelfUserId query -> 400 si usuari_id invalido', async () => {
    const res = await request(app)
      .get('/self-query')
      .query({ usuari_id: 'x' })
      .set(conductorAuthHeader(7));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('usuari_id invalido');
  });

  test('requireSelfUserId query -> 403 si usuari_id no coincide', async () => {
    const res = await request(app)
      .get('/self-query')
      .query({ usuari_id: 99 })
      .set(conductorAuthHeader(7));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('No autorizado');
  });

  test('requireSelfUserId query -> 200 si usuari_id coincide', async () => {
    const res = await request(app)
      .get('/self-query')
      .query({ usuari_id: 7 })
      .set(conductorAuthHeader(7));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('requireSelfUserId body -> 200 con usuari_id en body', async () => {
    const res = await request(app)
      .post('/self-body')
      .set(conductorAuthHeader(7))
      .send({ usuari_id: 7 });
    expect(res.status).toBe(200);
  });

  test('requireSelfUserId params -> 200 con usuari_id en ruta', async () => {
    const res = await request(app).get('/self-params/7').set(conductorAuthHeader(7));
    expect(res.status).toBe(200);
  });

  test('requireSelfUserId bodyOrQuery -> 200 leyendo query si body vacio', async () => {
    const res = await request(app)
      .post('/self-mixed')
      .query({ usuari_id: 7 })
      .set(conductorAuthHeader(7))
      .send({});
    expect(res.status).toBe(200);
  });

  test('requireSelfAsFriendActor -> 400 sin usuari_id1', async () => {
    const res = await request(app).post('/friend').set(conductorAuthHeader(7)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('usuari_id1 es requerido');
  });

  test('requireSelfAsFriendActor -> 403 si usuari_id1 no es el autenticado', async () => {
    const res = await request(app)
      .post('/friend')
      .set(conductorAuthHeader(7))
      .send({ usuari_id1: 99 });
    expect(res.status).toBe(403);
  });

  test('requireSelfAsFriendActor -> 200 con usuari_id1 correcto en query', async () => {
    const res = await request(app)
      .post('/friend')
      .query({ usuari_id1: 7 })
      .set(conductorAuthHeader(7))
      .send({});
    expect(res.status).toBe(200);
  });
});

describe('signConductorToken integration', () => {
  test('token generado por helper es aceptado por requireConductorAuth', async () => {
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 4, is_banned: false });
    const token = signConductorToken(4);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authUserId).toBe(4);
  });
});
