//Test de integracion para la gestion de favoritos
//Para ejecutarlo: npx jest favorite.test.js desde la carpeta backend o sus subcarpetas
const request = require('supertest');
const express = require('express');

//Importamos las rutas y la conexión a la base de datos
const favoritsRouter = require('../../routes/favorits');
const { pool } = require('../../lib/db');

//Creamos una mini-aplicación Express solo para este test
const app = express();
app.use(express.json());
app.use('/favorits', favoritsRouter);

describe('Pruebas de Integración - API de Favoritos', () => {
  //IDs altos para no chocar con datos reales de nuestra BD
  const testUserId = 99999;
  const testStationId = 88888;

  //PREPARACIÓN DEL ENTORNO (Setup)
  //Esto se hace antes de todos los tests
  beforeAll(async () => {
    //Limpiamos datos anteriores por seguridad
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);

    //Creamos un usuario de prueba (Usando tus columnas reales: email y username)
    await pool.query(`
      INSERT INTO ego.usuari (id, email, username)
      VALUES ($1, 'test_preferits@test.com', 'usuariotest99')
    `, [testUserId]);

    //Creamos una estación de prueba directamente en la base de datos
    await pool.query(`
      INSERT INTO ego.estaciones (id, external_id, nom, latitud, longitud, kw, is_manual)
      VALUES ($1, 'TEST-EXT-888', 'Estación Test Favoritos', 41.38, 2.16, 50, true)
    `, [testStationId]);
  });

  //LIMPIEZA FINAL
  //Esto se hace después de todos los tests
  afterAll(async () => {
    //Borramos los datos que hemos creado durante el testing
    await pool.query('DELETE FROM ego.favorits WHERE usuari_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.estaciones WHERE id = $1', [testStationId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);

    //Cerramos el pool de conexiones para que Jest termine correctamente
    await pool.end();
  });

/*
  Explicación funciones de testing:
    -request(app): Coge la aplicación Express (la variable app) y la "arranca" en la memoria del ordenador
    -.post('/favorits'): Aquí se especifica la peticion HTTP que queremos hacer al backend (la que le haria el frontend real).
    -.send(...) : Me indica el body de la peticion HTTP hecha
  */

  //LOS TESTS
  test('1. POST /favorits - Debe añadir un favorito correctamente (201)', async () => {
    const response = await request(app)
      .post('/favorits')
      .send({ usuari_id: testUserId, estacio_id: testStationId });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Estació afegida a preferits');
  });

  test('2. GET /favorits - Debe devolver la lista de favoritos del usuario (200)', async () => {
    const response = await request(app)
      .get('/favorits')
      .query({ usuari_id: testUserId });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    //Como el modelo de favorits hace "SELECT e.* de un inner join", la estación viene con el campo "id", no "estacio_id"
    const estacionEncontrada = response.body.find(estacion => estacion.id === testStationId);

    //Si por algún motivo esto falla, imprimimos el body para ver qué está devolviendo exactamente
    if (!estacionEncontrada) {
      console.log('Lo que devuelve el GET de favoritos:', response.body);
    }

    expect(estacionEncontrada).toBeDefined();
    //Verificamos que trae el nombre de la estación que guardamos
    expect(estacionEncontrada.nom).toBe('Estación Test Favoritos');
  });

  test('3. POST /favorits - Debe fallar si enviamos datos vacíos (500)', async () => {
    const response = await request(app)
      .post('/favorits')
      .send({}); //Enviamos un body vacío a propósito

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error al procesar la solicitud');
  });

  test('4. DELETE /favorits - Debe eliminar el favorito correctamente (200)', async () => {
    const response = await request(app)
      .delete('/favorits')
      .send({ usuari_id: testUserId, estacio_id: testStationId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Estació eliminada de preferits');

    //Verificamos directamente en la BD que la fila ya no existe
    const checkDb = await pool.query(
      'SELECT * FROM ego.favorits WHERE usuari_id = $1 AND estacio_id = $2',
      [testUserId, testStationId]
    );
    expect(checkDb.rows.length).toBe(0); //Esperamos no haya devuelto ninguna fila
  });
});
