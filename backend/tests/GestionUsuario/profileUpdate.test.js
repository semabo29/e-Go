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

    // Retorn de la consulta
    pool.query.mockResolvedValue(mockUpdatedUser);

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
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('Debería devolver error 400 si faltan campos requeridos', async () => {
    // Retorn de la consulta (error)
    pool.query.mockRejectedValue(new Error('Campos requeridos faltantes'));

    // Petició PUT sense dades
    const response = await request(app)
      .put('/user?usuari_id=1')
      .send({});

    // Comprovació
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('Debería devolver error 404 si el usuario no existe', async () => {
    // Retorn de la consulta (no hi ha usuari)
    pool.query.mockResolvedValue({ rows: [] });

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
  });

  it('Debería manejar errores de base de datos y devolver Status 500', async () => {
    // Retorn de la consulta (error de BD)
    pool.query.mockRejectedValue(new Error('Fallo de conexión a la BD'));

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
  });
});