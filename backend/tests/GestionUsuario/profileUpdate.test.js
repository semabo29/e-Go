const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db.js');

// Mock de la bd per a no fer consultes reals durant els tests
jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Endpoint PUT /user (Modificación de perfil)', () => {
  // Borrem els mocks després de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debería actualizar el perfil del usuario correctamente (Status 200)', async () => {
    // Dades del mock
    const mockUpdatedUser = {
      rows: [{
        id: 1,
        username: 'NuevoUsuario',
        email: 'nuevo@email.com',
        punts: 100,
        data_creacio: '2023-01-01',
        premium: false,
        admin: false,
        empresa: false
      }]
    };

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] })
      .mockResolvedValueOnce(mockUpdatedUser);

    // Petició PUT
    const response = await request(app)
      .put('/user?usuari_id=1')
      .send({
        username: 'NuevoUsuario',
        email: 'nuevo@email.com'
      });

    // Comprovació
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUpdatedUser.rows[0]);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('Debería devolver error 400 si faltan campos requeridos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] });

    // Petició PUT sense dades
    const response = await request(app)
      .put('/user?usuari_id=1')
      .send({});

    // Comprovació
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('Debería devolver error 404 si el usuario no existe', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    // Petició PUT
    const response = await request(app)
      .put('/user?usuari_id=999')
      .send({
        username: 'UsuarioInexistente',
        email: 'inexistente@email.com'
      });

    // Comprovació
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Usuario no encontrado');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('Debería manejar errores de base de datos y devolver Status 500', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, is_banned: false }] })
      .mockRejectedValueOnce(new Error('Fallo de conexión a la BD'));

    // Petició PUT
    const response = await request(app)
      .put('/user?usuari_id=1')
      .send({
        username: 'UsuarioTest',
        email: 'test@email.com'
      });

    // Comprovació
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Error actualizando información del usuario');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('Debería devolver 403 si el usuario está baneado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, is_banned: true }] });

    const response = await request(app)
      .put('/user?usuari_id=1')
      .send({
        username: 'X',
        email: 'x@test.com',
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('USER_BANNED');
    expect(response.body.error).toMatch(/baneada/i);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});