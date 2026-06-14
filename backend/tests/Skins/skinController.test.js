// Test d'integració per a les Skins de la botiga
const request = require('supertest');
const express = require('express');

// Importem rutes i connexió a bd
const skinsRouter = require('../../routes/skinRoutes');
const { pool } = require('../../lib/db');

// Creem una aplicació Express mockeada
const app = express();
app.use(express.json());
app.use('/api/skins', skinsRouter); // Ruta unificada

describe('Proves d\'integració de Skins i Garatge', () => {
  const testUserId = 200000;
  
  // 🟢 IDs controlats per garantir que existeixen i evitar errors 404 / Clau forana
  const defaultSkinId = 991;
  const testSkinComprar = 992;
  const testSkinEquipar = 992;
  const testSkinNoPunts = 993;

  beforeAll(async () => {
    // Neteja de seguretat inicial de testos anteriors
    await pool.query('DELETE FROM ego.conductor_skins WHERE conductor_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.conductor WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.skins WHERE id IN ($1, $2, $3)', [defaultSkinId, testSkinComprar, testSkinNoPunts]);

    // 1. Assegurem l'existència de 3 skins controlades a la base de dades
    await pool.query(`
      INSERT INTO ego.skins (id, nom, preu_punts, arxiu_asset) VALUES 
      ($1, 'Cotxe Bàsic Test', 0, 'cotxe_basic'),
      ($2, 'Rayo Veloz Test', 500, 'coche_rayo'),
      ($3, 'Cotxe Premium Test', 4000, 'caro')
      ON CONFLICT (id) DO UPDATE SET preu_punts = EXCLUDED.preu_punts
    `, [defaultSkinId, testSkinComprar, testSkinNoPunts]);

    // 2. Creem l'Usuari de test
    await pool.query(`INSERT INTO ego.usuari (id, email, username)
                      VALUES ($1, 'skins@test.com', 'testSkinsUser')`, [testUserId]);

    // 3. Creem el Conductor associat amb saldo de 5000 punts
    await pool.query(`INSERT INTO ego.conductor (user_id, punts)
                      VALUES ($1, 5000)`, [testUserId]);
                      
    // 4. Li assignem la skin base equipada per defecte al seu inventari
    await pool.query(`INSERT INTO ego.conductor_skins (conductor_id, skin_id, equipada, data_obtencio)
                      VALUES ($1, $2, TRUE, NOW())`, [testUserId, defaultSkinId]);
  });

  afterAll(async () => {
    // Neteja final absoluta del garatge de proves per no embrutar la base de dades
    await pool.query('DELETE FROM ego.conductor_skins WHERE conductor_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.conductor WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.usuari WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM ego.skins WHERE id IN ($1, $2, $3)', [defaultSkinId, testSkinComprar, testSkinNoPunts]);
    await pool.end();
  });

  test('Consultar totes les skins de la botiga (codi 200) | GET a /api/skins', async () => {
    const response = await request(app).get('/api/skins');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verifiquem que els camps claus existeixin
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('arxiu_asset');
    expect(response.body[0]).toHaveProperty('preu_punts');
  });

  test('Consultar inventari i punts del conductor (codi 200) | GET a /api/skins/conductor/:id', async () => {
    const response = await request(app).get(`/api/skins/conductor/${testUserId}`);
    expect(response.status).toBe(200);
    
    const data = response.body;
    expect(data).toHaveProperty('inventari');
    expect(data).toHaveProperty('punts');
    
    expect(data.punts).toBe(5000);
    expect(Array.isArray(data.inventari)).toBe(true);
    
    // 🟢 CORREGIT: Ara busquem l'ID real inserit dinàmicament en el abans de fallar per undefined
    const baseSkin = data.inventari.find(s => s.id === defaultSkinId);
    expect(baseSkin).toBeDefined();
    expect(baseSkin.equipada === true || baseSkin.equipada === 'true' || baseSkin.equipada === 1).toBe(true);
  });

  test('Comprar una skin correctament restant punts (codi 200) | POST a /api/skins/conductor/:id/buy', async () => {
    const response = await request(app)
      .post(`/api/skins/conductor/${testUserId}/buy`)
      .send({ skin_id: testSkinComprar });

    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.punts_restants).toBeLessThan(5000); // S'han restat punts
  });

  test('No permet comprar una skin si no té punts (codi 400)', async () => {
    // Arruïnem a l'usuari primer
    await pool.query('UPDATE ego.conductor SET punts = 0 WHERE user_id = $1', [testUserId]);

    const response = await request(app)
      .post(`/api/skins/conductor/${testUserId}/buy`)
      .send({ skin_id: testSkinNoPunts }); // 🟢 CORREGIT: ID garantit a la base de dades per evitar el 404

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No tens punts suficients');
  });

  test('No permet comprar la mateixa skin dos cops (codi 400)', async () => {
    // Li tornem a donar punts
    await pool.query('UPDATE ego.conductor SET punts = 5000 WHERE user_id = $1', [testUserId]);

    const response = await request(app)
      .post(`/api/skins/conductor/${testUserId}/buy`)
      .send({ skin_id: testSkinComprar }); // Intentem comprar la que ja té del test número 3

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Ja posseeixes aquesta skin');
  });

  test('Equipar una skin desequipant les anteriors (codi 200) | PUT a /api/skins/conductor/:id/equip', async () => {
    const response = await request(app)
      .put(`/api/skins/conductor/${testUserId}/equip`)
      .send({ skin_id: testSkinEquipar });

    expect(response.status).toBe(200);
    
    // Verifiquem a la BD que només hi hagi 1 skin equipada per aquest conductor
    const checkDb = await pool.query('SELECT skin_id FROM ego.conductor_skins WHERE conductor_id = $1 AND equipada = TRUE', [testUserId]);
    
    expect(checkDb.rowCount).toBe(1);
    expect(checkDb.rows[0].skin_id).toBe(testSkinEquipar);
  });
});