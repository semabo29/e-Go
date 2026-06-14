const request = require('supertest');
const app = require('../../index.jsx'); // Asegúrate de que la extensión sea la correcta (.js o .jsx según tu index)
const { pool } = require('../../lib/db');

// Mockeamos (simulamos) la base de datos para no hacer consultas reales durante el test
jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Endpoint GET /ranking', () => {
  // Limpiamos los mocks después de cada test para que no interfieran entre sí
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debería devolver el top 50 del ranking correctamente (Status 200)', async () => {
    // 1. Preparamos los datos falsos que "devolvería" la base de datos
    const mockRankingData = {
      rows: [
        { username: 'EcoDriver_BCN', punts: 850 },
        { username: 'VoltMaster', punts: 720 },
        { username: 'ChargeKing', punts: 500 }
      ]
    };
    
    // Le decimos a la base de datos falsa que devuelva esos datos
    pool.query.mockResolvedValue(mockRankingData);

    // 2. Hacemos la petición real a nuestro endpoint usando supertest
    const response = await request(app).get('/ranking');

    // 3. Comprobamos que el resultado es exactamente lo que esperábamos
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRankingData.rows);
    expect(pool.query).toHaveBeenCalledTimes(1); // Verificamos que se llamó a la DB
  });

  it('Debería manejar errores de base de datos y devolver Status 500', async () => {
    // 1. Simulamos que la base de datos falla (ej. se ha caído el servidor de Postgres)
    pool.query.mockRejectedValue(new Error('Fallo de conexión a la BD'));

    // 2. Hacemos la petición
    const response = await request(app).get('/ranking');

    // 3. Comprobamos que el backend lo gestiona bien con un error 500
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Error interno del servidor al cargar el ranking');
  });
});

describe('Endpoint GET /ranking/friends', () => {
  // Limpiamos los mocks después de cada test para que no interfieran entre sí
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debería devolver el ranking de amigos correctamente (Status 200)', async () => {
    // 1. Preparamos los datos falsos de amigos
    const mockFriendsRankingData = {
      rows: [
        { id: 2, username: 'VoltMaster', punts: 720 },
        { id: 3, username: 'ChargeKing', punts: 500 }
      ]
    };
    
    // Le decimos a la base de datos falsa que devuelva esos datos
    pool.query.mockResolvedValue(mockFriendsRankingData);

    // 2. Hacemos la petición con el parámetro usuari_id
    const response = await request(app).get('/ranking/friends?usuari_id=1');

    // 3. Comprobamos que el resultado es exactamente lo que esperábamos
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockFriendsRankingData.rows);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ["1"]);
  });

  it('Debería devolver Status 400 cuando falta el parámetro usuari_id', async () => {
    // 1. Hacemos la petición sin el parámetro usuari_id
    const response = await request(app).get('/ranking/friends');

    // 2. Comprobamos que devuelve error 400
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('usuari_id es requerido');
  });

  it('Debería devolver un array vacío cuando el usuario no tiene amigos (Status 200)', async () => {
    // 1. Preparamos datos vacíos (usuario sin amigos)
    const mockEmptyRankingData = {
      rows: []
    };
    
    pool.query.mockResolvedValue(mockEmptyRankingData);

    // 2. Hacemos la petición
    const response = await request(app).get('/ranking/friends?usuari_id=1');

    // 3. Comprobamos que devuelve un array vacío correctamente
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('Debería manejar errores de base de datos en el ranking de amigos (Status 500)', async () => {
    // 1. Simulamos que la base de datos falla
    pool.query.mockRejectedValue(new Error('Fallo de conexión a la BD'));

    // 2. Hacemos la petición
    const response = await request(app).get('/ranking/friends?usuari_id=1');

    // 3. Comprobamos que el backend lo gestiona bien con un error 500
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Error interno del servidor al cargar el ranking de amigos');
  });
});