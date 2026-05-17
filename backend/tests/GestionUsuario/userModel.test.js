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

describe('userModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    test('findByEmail devuelve usuario cuando existe', async () => {
      const mockUser = { id: 1, email: 'test@test.com', username: 'test' };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['test@test.com']);
    });

    test('findByEmail devuelve null cuando no existe usuario', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findByEmail('noexiste@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findConductorByEmail', () => {
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
  });

  describe('findByEmailWithPassword', () => {
    test('findByEmailWithPassword devuelve usuario con password_hash', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: 'test@test.com',
            username: 'test',
            password_hash: 'hash123',
          },
        ],
      });

      const result = await userModel.findByEmailWithPassword('test@test.com');

      expect(result).toEqual({
        id: 1,
        email: 'test@test.com',
        username: 'test',
        password_hash: 'hash123',
      });
    });

    test('findByEmailWithPassword devuelve null cuando no existe usuario', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findByEmailWithPassword('noexiste@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findConductorByEmailWithPassword', () => {
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

    test('findConductorByEmailWithPassword devuelve null cuando no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findConductorByEmailWithPassword('noexiste@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findAdminByEmailWithPassword', () => {
    test('findAdminByEmailWithPassword devuelve admin con password_hash', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 1,
            email: 'admin@test.com',
            username: 'admin',
            password_hash: 'adminhash',
            admin_since: '2024-01-01',
          },
        ],
      });

      const result = await userModel.findAdminByEmailWithPassword('admin@test.com');

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          email: 'admin@test.com',
          username: 'admin',
          password_hash: 'adminhash',
        })
      );
      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('INNER JOIN');
      expect(query).toContain('admins');
    });

    test('findAdminByEmailWithPassword devuelve null cuando no es admin', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findAdminByEmailWithPassword('user@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findCompanyByEmailWithPassword', () => {
    test('findCompanyByEmailWithPassword devuelve company con password_hash', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            user_id: 5,
            email: 'company@test.com',
            username: 'company',
            password_hash: 'companyhash',
            nombre: 'Mi Empresa',
            company_since: '2024-01-01',
          },
        ],
      });

      const result = await userModel.findCompanyByEmailWithPassword('company@test.com');

      expect(result).toEqual(
        expect.objectContaining({
          id: 5,
          email: 'company@test.com',
          username: 'company',
          password_hash: 'companyhash',
          nombre: 'Mi Empresa',
        })
      );
      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('INNER JOIN');
      expect(query).toContain('empresas');
    });

    test('findCompanyByEmailWithPassword devuelve null cuando no es empresa', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findCompanyByEmailWithPassword('user@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    test('findById devuelve usuario cuando existe', async () => {
      const mockUser = { id: 1, email: 'test@test.com', username: 'test' };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.findById(1);

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    test('findById devuelve null cuando no existe usuario', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('getInfoUser', () => {
    test('getInfoUser devuelve información completa del usuario', async () => {
      const mockInfo = {
        id: 1,
        username: 'test',
        email: 'test@test.com',
        punts: 100,
        created_at: '2024-01-01',
        premium: true,
        admin: false,
        empresa: false,
      };
      pool.query.mockResolvedValueOnce({ rows: [mockInfo] });

      const result = await userModel.getInfoUser(1);

      expect(result).toEqual(mockInfo);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    test('getInfoUser devuelve undefined cuando usuario no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.getInfoUser(999);

      expect(result).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    test('updateUser actualiza el username del usuario', async () => {
      const mockUpdated = {
        id: 1,
        email: 'test@test.com',
        username: 'nuevo_username',
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await userModel.updateUser(1, 'nuevo_username');

      expect(result).toEqual(mockUpdated);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'nuevo_username']);
    });

    test('updateUser lanza error cuando falta username', async () => {
      await expect(userModel.updateUser(1, '')).rejects.toThrow('Falta el campo username');
    });

    test('updateUser devuelve null cuando usuario no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.updateUser(999, 'nuevo');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    test('createUser crea un nuevo usuario', async () => {
      const mockUser = {
        id: 10,
        email: 'nuevo@test.com',
        username: 'nuevo',
        created_at: '2024-01-15',
        updated_at: '2024-01-15',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.createUser('nuevo@test.com', 'nuevo');

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
        'nuevo@test.com',
        'nuevo',
      ]);
    });

    test('createUser retorna el usuario creado con todos los campos', async () => {
      const mockUser = {
        id: 15,
        email: 'test@example.com',
        username: 'testuser',
        created_at: '2024-01-20',
        updated_at: '2024-01-20',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.createUser('test@example.com', 'testuser');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('created_at');
    });
  });

  describe('createLocalUser', () => {
    test('createLocalUser crea usuario con password_hash', async () => {
      const mockUser = {
        id: 11,
        email: 'local@test.com',
        username: 'local',
        created_at: '2024-01-16',
        updated_at: '2024-01-16',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.createLocalUser('local@test.com', 'local', 'hash123');

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
        'local@test.com',
        'local',
        'hash123',
      ]);
    });
  });

  describe('setPasswordHashByUserId', () => {
    test('setPasswordHashByUserId actualiza el password_hash', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        username: 'test',
        created_at: '2024-01-01',
        updated_at: '2024-01-20',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userModel.setPasswordHashByUserId(1, 'newhash123');

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'newhash123']);
    });

    test('setPasswordHashByUserId devuelve null cuando usuario no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userModel.setPasswordHashByUserId(999, 'hash');

      expect(result).toBeNull();
    });
  });

  describe('ensureConductorForUser', () => {
    test('ensureConductorForUser inserta conductor para usuario', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await userModel.ensureConductorForUser(1);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('INSERT INTO');
      expect(query).toContain('ON CONFLICT');
    });
  });

  describe('backfillConductoresFromUsuarios', () => {
    test('backfillConductoresFromUsuarios crea conductores faltantes', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 5 });

      const result = await userModel.backfillConductoresFromUsuarios();

      expect(result).toBe(5);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('INSERT INTO');
      expect(query).toContain('SELECT');
      expect(query).toContain('LEFT JOIN');
    });

    test('backfillConductoresFromUsuarios retorna 0 cuando no hay usuarios faltantes', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await userModel.backfillConductoresFromUsuarios();

      expect(result).toBe(0);
    });
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

  test('findByIdWithBanStatus devuelve fila o null', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 7, is_banned: true, banned_at: 't', banned_reason: 'x' }],
    });
    expect(await userModel.findByIdWithBanStatus(7)).toEqual(
      expect.objectContaining({ is_banned: true })
    );
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await userModel.findByIdWithBanStatus(999)).toBeNull();
  });

  test('listAllUsersForAdmin devuelve todas las filas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'a@test.com', username: 'a', is_banned: false },
        { id: 2, email: 'b@test.com', username: 'b', is_banned: true },
      ],
    });
    const users = await userModel.listAllUsersForAdmin();
    expect(users).toHaveLength(2);
    expect(pool.query.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
  });

  test('setUserBanStatus actualiza y devuelve usuario o null', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'c@test.com', username: 'c', is_banned: true, banned_reason: 'manual' }],
    });
    const banned = await userModel.setUserBanStatus(3, { isBanned: true, reason: 'manual' });
    expect(banned?.is_banned).toBe(true);
    expect(pool.query.mock.calls[0][1]).toEqual([3, true, 'manual']);

    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await userModel.setUserBanStatus(404, { isBanned: false, reason: '' })).toBeNull();
  });

  test('updateCompanyNombre valida entrada y actualiza', async () => {
    await expect(userModel.updateCompanyNombre(1, '   ')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(userModel.updateCompanyNombre('nope', 'Empresa')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await userModel.updateCompanyNombre(5, 'Empresa SA')).toBeNull();

    pool.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 5, nombre: 'Empresa SA', created_at: 't' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    expect(await userModel.updateCompanyNombre(5, 'Empresa SA')).toBeNull();

    pool.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 5, nombre: 'Empresa SA', created_at: 't' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 5, email: 'co@test.com', username: 'co' }],
      });
    const company = await userModel.updateCompanyNombre(5, 'Empresa SA');
    expect(company).toEqual(
      expect.objectContaining({
        id: 5,
        email: 'co@test.com',
        nombre: 'Empresa SA',
      })
    );
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
