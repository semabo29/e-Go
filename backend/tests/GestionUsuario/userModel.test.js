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
});
