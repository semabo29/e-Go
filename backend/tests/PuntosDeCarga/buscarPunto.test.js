const request = require('supertest');
// Ajusta la ruta a on tinguis el teu fitxer principal d'Express (index.js, app.js, etc.)
const app = require('../../index.jsx');

describe("Cercador d'Estacions (GET /stations/search)", () => {

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