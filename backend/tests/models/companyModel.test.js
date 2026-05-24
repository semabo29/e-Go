const { findCompanyByEmail } = require('../../models/companyModel');
const { pool, EMPRESAS_TABLE, USUARIOS_TABLE } = require('../../lib/db');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  EMPRESAS_TABLE: '"ego"."empresas"',
  USUARIOS_TABLE: '"ego"."usuari"',
}));

describe('companyModel.findCompanyByEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devuelve la fila cuando existe', async () => {
    const row = {
      id: 1,
      user_id: 1,
      email: 'co@test.com',
      username: 'empresa',
      nombre: 'ACME',
      created_at: '2026-01-01',
    };
    pool.query.mockResolvedValue({ rows: [row] });

    const result = await findCompanyByEmail('co@test.com');

    expect(result).toEqual(row);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain(EMPRESAS_TABLE);
    expect(sql).toContain(USUARIOS_TABLE);
    expect(sql).toContain('WHERE u.email = $1');
    expect(params).toEqual(['co@test.com']);
  });

  test('devuelve null cuando no hay filas', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await findCompanyByEmail('missing@test.com');
    expect(result).toBeNull();
  });
});
