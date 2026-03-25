// tests/PuntosDeCarga/buscarPunto.test.js
const request = require('supertest');
const app = require('../../index.jsx');
const { pool } = require('../../lib/db');
const { upsertStation } = require('../../models/stationModel');

describe("Cercador d'Estacions (GET /stations/search)", () => {

  // PREPAREM LES DADES ABANS DELS TESTS
  beforeAll(async () => {
    // 1. Netegem la base de dades perquè no interfereixin altres tests
    await pool.query('DELETE FROM ego.estaciones');

    // 2. Inserim una estació a Barcelona (per als tests 1 i 2)
    await upsertStation({
      id: 'ST-BCN-1',
      nom: 'Estació BCN Centre',
      municipi: 'Barcelona',
      latitud: '41.38',
      longitud: '2.16',
      kw: '50',
      ac_dc: 'AC/DC',
      tipus_connexi: 'Type 2'
    });

    // 3. Inserim una estació a Girona, només DC (per al test 5)
    await upsertStation({
      id: 'ST-GIR-1',
      nom: 'Estació Girona Ràpida',
      municipi: 'Girona',
      latitud: '41.98',
      longitud: '2.82',
      kw: '150',
      ac_dc: 'DC',
      tipus_connexi: 'CCS2'
    });
  });

  // TANQUEM LA CONNEXIÓ AL FINAL PER EVITAR EL "OPEN HANDLES"
  afterAll(async () => {
    // Esborrem TOTES les estacions de prova abans de marxar
    await pool.query('DELETE FROM ego.estaciones');
    await pool.end();
  });


  test('1. Hauria de retornar estacions si busquem només per text (q)', async () => {
    const response = await request(app).get('/stations/search?q=barcelona');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    // Comprovem que almenys ens torna resultats
    expect(response.body.length).toBeGreaterThan(0);
    // Comprovem que els resultats tenen les dades esperades
    expect(response.body[0]).toHaveProperty('nom');
    expect(response.body[0]).toHaveProperty('municipi');
  });

  test('2. Hauria de retornar estacions aplicant text (q) + filtre de potència (minKw)', async () => {
    const response = await request(app).get('/stations/search?q=barcelona&minKw=50');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();

    // Verifiquem que tots els resultats retornats realment compleixen el filtre de >= 50kW
    response.body.forEach(station => {
      expect(parseFloat(station.kw)).toBeGreaterThanOrEqual(50);
    });
  });

  test('3. Hauria de retornar un array buit si la cerca no té cap sentit', async () => {
    const response = await request(app).get('/stations/search?q=CercaQueNoExisteixMaiDeLaVida123');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(0); // L'array ha d'estar buit
  });

  test('4. Hauria de retornar un array buit si no enviem la (q)', async () => {
    const response = await request(app).get('/stations/search');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(0); // El nostre controlador retorna [] si no hi ha q
  });

  test('5. Hauria de filtrar bé pel tipus de corrent (AC/DC)', async () => {
    const response = await request(app).get('/stations/search?q=girona&ac_dc=DC');

    expect(response.status).toBe(200);
    response.body.forEach(station => {
      // El valor pot ser "DC" o contenir "DC", depenent de la teva BD
      expect(station.ac_dc).toMatch(/DC/i);
    });
  });
});