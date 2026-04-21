//Test d'integració per a vehicles
//Per executar-lo fer: npx jest vehicle.test.js desde la carpeta backend o les seves subcarpetes
const request = require('supertest');
const express = require('express');

//Importem rutes i connexió a bd
const vehiclesRouter = require('../../routes/vehicles');
const { pool } = require('../../lib/db');

//Creem una aplicació Express
const app = express();

app.use(express.json());
app.use('/car', vehiclesRouter);

describe('Proves dintegració de vehicles', () => {
  //id d'usuari alt per evitar conflictes amb dades reals
  const testUserId = 100000;
  const testCarName = 'Test 3000';
  const testCarPotencia = 200;
  const testCarCorrent = 'AC';
  const testCarConector = 'CHAdeMO';

  //Setup de l'entorn abans dels tests
  beforeAll(async () => {
    //Esborrem per si un cas
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.vehicles WHERE usuari_id = $1', [testUserId]);

    //Usuari de prova
    await pool.query(`INSERT INTO ego.conductor (id, email, username)
                      VALUES ($1, 'conductor@test.com', 'testVehicle')`, [testUserId]);

    //Vehicle de prova
    await pool.query(`INSERT INTO ego.vehicles (usuari_id, nom, kw, ac_dc, tipus_connexio)
                      VALUES ($1, $2, $3, $4, $5)`,
                      [testUserId, testCarName, testCarPotencia, testCarCorrent, testCarConector]);
  });

  //Esborrar després dels tests
  afterAll(async () => {
    await pool.query('DELETE FROM ego.conductor WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.vehicles WHERE usuari_id = $1', [testUserId]);

    //Tanquem pool de connexions per evitar que el procés es quedi penjat
    await pool.end();
  });

/*
  Funcions de testing:
    -request(app): Executa l'aplicació Express (variable app) en memòria de l'ordinador.
    -.post('/car') (o .get, .delete): Petició que es fa al backend com si fos el frontend.
    -.send(...) : Paràmetres de la petició.
  */

  test('Afegir correctament un vehicle (codi 201) | POST a /car', async () => {
    const response = await request(app)
      .post('/car')
      .send({ usuari_id: testUserId, v_nom: 'Test 5000', v_potencia: testCarPotencia, v_corrent: testCarCorrent, v_conector: testCarConector });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Vehicle afegit');
  });

  test('Falla si no senvien les dades correctes al intentar afegir un vehicle (codi 500) | POST a /car', async () => {
    const response = await request(app)
      .post('/car')
      .send({}); //Dades buides

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error al processar la solicitud');
  });

  test('Consultar la llista de vehicles d\'un usuari (codi 200) | GET a /car', async () => {
    const response = await request(app)
      .get('/car')
      .query({ usuari_id: testUserId });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    //Agafem el vehicle de prova de la resposta
    const estaElVehicle = response.body.find(vehicle => (vehicle.usuari_id === testUserId && vehicle.nom === testCarName));

    //Si no el troba, imprimim el contingut de la resposta per ajudar a depurar
    if (!estaElVehicle) {
      console.log('contingut del GET de vehicles:', response.body);
    }

    expect(estaElVehicle).toBeDefined();
    //Verifiquem les dades del vehicle
    expect(estaElVehicle.nom).toBe(testCarName);
    expect(Number(estaElVehicle.kw)).toBe(testCarPotencia);
    expect(estaElVehicle.ac_dc).toBe(testCarCorrent);
    expect(estaElVehicle.tipus_connexio).toBe(testCarConector);
  });

  test('Eliminar correctament un vehicle (codi 200) | DELETE a /car', async () => {
    const response = await request(app)
      .delete('/car')
      .send({ usuari_id: testUserId, v_nom: testCarName });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Vehicle eliminat');

    //Comprovem que s'ha eliminat de la bd
    const comprovaDb = await pool.query(`SELECT * FROM ego.vehicles
                                          WHERE usuari_id = $1 AND nom = $2`,
                                          [testUserId, testCarName]);
    //No s'esperen resultats
    expect(comprovaDb.rows.length).toBe(0);
  });
});
