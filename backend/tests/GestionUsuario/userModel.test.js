const { pool } = require('../../lib/db');
const userModel = require('../../models/userModel');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  USUARIOS_TABLE: '"ego"."usuari"',
  CONDUCTORES_TABLE: '"ego"."conductor"',
  SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
  ADMINS_TABLE: '"ego"."admins"',
  EMPRESAS_TABLE: '"ego"."empresas"',
}));

describe('userModel conductor lookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findConductorByEmail devuelve usuario cuando existe en usuari y conductor', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'pau@test.com', username: 'pau' }],
    });

    const result = await userModel.findConductorByEmail('pau@test.com');

    expect(result).toEqual({ id: 2, email: 'pau@test.com', username: 'pau' });
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [query, values] = pool.query.mock.calls[0];
    expect(query).toContain('JOIN "ego"."conductor" c ON c.user_id = u.id');
    expect(query).toContain('WHERE u.email = $1');
    expect(values).toEqual(['pau@test.com']);
  });

  test('findConductorByEmail devuelve null cuando no existe fila de conductor', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await userModel.findConductorByEmail('missing@test.com');

    expect(result).toBeNull();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('findConductorByEmailWithPassword devuelve password_hash cuando existe conductor', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          email: 'driver@test.com',
          username: 'driver',
          password_hash: 'hash123',
        },
      ],
    });

    const result = await userModel.findConductorByEmailWithPassword('driver@test.com');

    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        email: 'driver@test.com',
        username: 'driver',
        password_hash: 'hash123',
      })
    );
    const [query] = pool.query.mock.calls[0];
    expect(query).toContain('JOIN "ego"."conductor" c ON c.user_id = u.id');
  });

  test('findByEmailWithPassword propaga error si no es 42703', async () => {
    pool.query.mockRejectedValueOnce({ code: '57014', message: 'cancelled' });
    await expect(userModel.findByEmailWithPassword('x@test.com')).rejects.toEqual(
      expect.objectContaining({ code: '57014' })
    );
  });

  test('updateUser solo actualiza email', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'soloemail@test.com', username: 'keep', created_at: 't', updated_at: 't' }],
    });
    const out = await userModel.updateUser(1, undefined, 'soloemail@test.com');
    expect(out?.email).toBe('soloemail@test.com');
    const [q] = pool.query.mock.calls[0];
    expect(q).toContain('email =');
    expect(q).not.toMatch(/username = \$2/);
  });

  test('findByEmail devuelve usuario o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'e@test.com', username: 'u' }] });
    expect(await userModel.findByEmail('e@test.com')).toEqual(
      expect.objectContaining({ email: 'e@test.com' })
    );
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await userModel.findByEmail('none@test.com')).toBeNull();
  });

  test('findById devuelve usuario o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, email: 'a@a.com', username: 'a' }] });
    expect(await userModel.findById(5)).toEqual(expect.objectContaining({ id: 5 }));
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await userModel.findById(999)).toBeNull();
  });

  test('findByEmailWithPassword y findAdminByEmailWithPassword consultan pool', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'x@test.com', username: 'x', password_hash: 'h', created_at: 't', updated_at: 't' }],
    });
    const u = await userModel.findByEmailWithPassword('x@test.com');
    expect(u?.password_hash).toBe('h');

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          user_id: 2,
          email: 'adm@test.com',
          username: 'adm',
          password_hash: 'h2',
          admin_since: new Date(),
        },
      ],
    });
    const a = await userModel.findAdminByEmailWithPassword('adm@test.com');
    expect(a?.email).toBe('adm@test.com');

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          user_id: 3,
          email: 'co@test.com',
          username: 'co',
          password_hash: 'hc',
          nombre: 'Empresa',
          company_since: new Date(),
        },
      ],
    });
    const c = await userModel.findCompanyByEmailWithPassword('co@test.com');
    expect(c?.nombre).toBe('Empresa');
  });

  test('getInfoUser devuelve fila de pool', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          username: 'n',
          email: 'e@test.com',
          punts: 0,
          created_at: 't',
          premium: false,
          admin: false,
          empresa: false,
        },
      ],
    });
    const row = await userModel.getInfoUser(1);
    expect(row.email).toBe('e@test.com');
  });

  test('getInfoUser lanza si pool devuelve null', async () => {
    pool.query.mockResolvedValueOnce(null);
    await expect(userModel.getInfoUser(1)).rejects.toThrow('User not found');
  });

  test('updateUser actualiza campos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'new@test.com', username: 'newu', created_at: 't', updated_at: 't' }],
    });
    const out = await userModel.updateUser(1, 'newu', 'new@test.com');
    expect(out?.username).toBe('newu');
  });

  test('updateUser lanza si no hay campos', async () => {
    await expect(userModel.updateUser(1, undefined, undefined)).rejects.toThrow('No fields to update');
  });

  test('createUser inserta', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, email: 'n@test.com', username: 'nu', created_at: 't', updated_at: 't' }],
    });
    const u = await userModel.createUser('n@test.com', 'nu');
    expect(u.id).toBe(10);
  });

  test('createLocalUser inserta con hash', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 11, email: 'l@test.com', username: 'lu', created_at: 't', updated_at: 't' }],
    });
    const u = await userModel.createLocalUser('l@test.com', 'lu', 'hash');
    expect(u.email).toBe('l@test.com');
  });

  test('setPasswordHashByUserId actualiza', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@a.com', username: 'a', created_at: 't', updated_at: 't' }],
    });
    const u = await userModel.setPasswordHashByUserId(1, 'newhash');
    expect(u).toBeTruthy();
  });

  test('ensureConductorForUser y backfillConductoresFromUsuarios', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    await userModel.ensureConductorForUser(3);
    pool.query.mockResolvedValueOnce({ rowCount: 2 });
    const n = await userModel.backfillConductoresFromUsuarios();
    expect(n).toBe(2);
  });
});

describe('userModel withPasswordColumnRetry (42703)', () => {
  test('reintenta tras columna ausente', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            email: 'pw@test.com',
            username: 'pw',
            password_hash: 'h',
            created_at: 't',
            updated_at: 't',
          },
        ],
      });
    const row = await freshUserModel.findByEmailWithPassword('pw@test.com');
    expect(row?.password_hash).toBe('h');
    expect(pool.query).toHaveBeenCalled();
  });

  test('findConductorByEmailWithPassword reintenta tras 42703', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            email: 'drv2@test.com',
            username: 'drv2',
            password_hash: 'hx',
            created_at: 't',
            updated_at: 't',
          },
        ],
      });
    const row = await freshUserModel.findConductorByEmailWithPassword('drv2@test.com');
    expect(row?.password_hash).toBe('hx');
  });

  test('findAdminByEmailWithPassword reintenta tras 42703', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 11,
            user_id: 11,
            email: 'adm2@test.com',
            username: 'adm2',
            password_hash: 'ha',
            admin_since: new Date(),
          },
        ],
      });
    const row = await freshUserModel.findAdminByEmailWithPassword('adm2@test.com');
    expect(row?.email).toBe('adm2@test.com');
  });

  test('findCompanyByEmailWithPassword reintenta tras 42703', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 12,
            user_id: 12,
            email: 'co2@test.com',
            username: 'co2',
            password_hash: 'hc',
            nombre: 'Co SA',
            company_since: new Date(),
          },
        ],
      });
    const row = await freshUserModel.findCompanyByEmailWithPassword('co2@test.com');
    expect(row?.nombre).toBe('Co SA');
  });

  test('createLocalUser reintenta tras 42703', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ id: 99, email: 'cl@test.com', username: 'cl', created_at: 't', updated_at: 't' }],
      });
    const u = await freshUserModel.createLocalUser('cl@test.com', 'cl', 'hpw');
    expect(u.email).toBe('cl@test.com');
  });

  test('setPasswordHashByUserId reintenta tras 42703', async () => {
    jest.resetModules();
    jest.doMock('../../lib/db', () => ({
      pool: { query: jest.fn() },
      USUARIOS_TABLE: '"ego"."usuari"',
      CONDUCTORES_TABLE: '"ego"."conductor"',
      SUBSCRIPTIONS_TABLE: '"ego"."subscription"',
      ADMINS_TABLE: '"ego"."admins"',
      EMPRESAS_TABLE: '"ego"."empresas"',
    }));
    const { pool } = require('../../lib/db');
    const freshUserModel = require('../../models/userModel');
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ id: 88, email: 'sp@test.com', username: 'sp', created_at: 't', updated_at: 't' }],
      });
    const u = await freshUserModel.setPasswordHashByUserId(88, 'newhash');
    expect(u?.email).toBe('sp@test.com');
  });
});
