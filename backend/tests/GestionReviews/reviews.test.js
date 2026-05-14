const request = require('supertest');
const express = require('express');

// 1. Mockejar la connexió a la BD per no tocar dades reals
jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// 2. Mockejar el middleware d'autenticació
// Simulem que qualsevol petició que passi per 'requireAuth' tindrà un usuari injectat amb id = 99
jest.mock('../../middleware/requireAuth', () => ({
  requireAuth: jest.fn((req, res, next) => {
    req.user = { id: 99 };
    next();
  }),
}));

const { pool } = require('../../lib/db');
const reviewsRouter = require('../../routes/reviews'); // Ajusta la ruta a on tinguis el router

// 3. Muntem una mini-app Express per als tests
const app = express();
app.use(express.json());
app.use('/', reviewsRouter); // Muntem les rutes al root per defecte

describe('Proves d\'Integració Mockejades - Ressenyes', () => {

  // Netejem els mocks abans de cada test perquè no interfereixin
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // GET /stations/:stationId/reviews
  // ==========================================
  describe('GET /stations/:stationId/reviews', () => {
    it('Deuria retornar les ressenyes d\'una estació correctament (200)', async () => {
      // Dades simulades que retornaria Postgres
      const mockReviewsData = {
        rows: [
          { id: 1, puntuacio: 5, comentari: 'Genial', likes_count: '10', user_has_liked: true },
          { id: 2, puntuacio: 4, comentari: 'Bé', likes_count: '0', user_has_liked: false }
        ]
      };
      pool.query.mockResolvedValue(mockReviewsData);

      const response = await request(app).get('/stations/10/reviews?userId=99');

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(1);

      // Verifiquem que ha convertit el 'likes_count' de String a Número com demana el controlador
      expect(response.body[0].likes_count).toBe(10);
      expect(response.body[1].likes_count).toBe(0);
    });

    it('Deuria gestionar errors de la BD i retornar Status 500', async () => {
      pool.query.mockRejectedValue(new Error('BD Caiguda'));

      const response = await request(app).get('/stations/10/reviews');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error intern del servidor');
    });
  });

  // ==========================================
  // POST /stations/:stationId/reviews
  // ==========================================
  describe('POST /stations/:stationId/reviews', () => {
    it('Deuria crear una ressenya correctament (201)', async () => {
      const novaRessenya = { id: 5, usuari_id: 99, puntuacio: 4, comentari: 'Carrega ràpid' };
      pool.query.mockResolvedValue({ rows: [novaRessenya] });

      const response = await request(app)
        .post('/stations/10/reviews')
        .send({ puntuacio: 4, comentari: 'Carrega ràpid' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(novaRessenya);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('Deuria retornar 400 si la puntuació és invàlida', async () => {
      const response = await request(app)
        .post('/stations/10/reviews')
        .send({ puntuacio: 6, comentari: 'Impossible' }); // > 5

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La puntuació ha de ser entre 1 i 5');
      expect(pool.query).not.toHaveBeenCalled(); // No hauria ni d'arribar a la BD
    });
  });

  // ==========================================
  // PUT /reviews/:reviewId
  // ==========================================
  describe('PUT /reviews/:reviewId', () => {
    it('Deuria editar una ressenya pròpia correctament (200)', async () => {
      const ressenyaEditada = { id: 5, puntuacio: 3, comentari: 'Ja no tan bé' };
      pool.query.mockResolvedValue({ rows: [ressenyaEditada], rowCount: 1 });

      const response = await request(app)
        .put('/reviews/5')
        .send({ puntuacio: 3, comentari: 'Ja no tan bé' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(ressenyaEditada);
    });

    it('Deuria retornar 404 si la ressenya no existeix o no és de l\'usuari', async () => {
      // rowCount = 0 simula que l'UPDATE no ha afectat cap fila
      pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/reviews/999')
        .send({ puntuacio: 5, comentari: 'Prova' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ressenya no trobada o no tens permisos per editar-la.');
    });
  });

  // ==========================================
  // DELETE /reviews/:reviewId
  // ==========================================
  describe('DELETE /reviews/:reviewId', () => {
    it('Deuria esborrar una ressenya pròpia correctament (200)', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 });

      const response = await request(app).delete('/reviews/5');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Ressenya esborrada correctament');
    });

    it('Deuria retornar 404 a l\'intentar esborrar una ressenya d\'un altre', async () => {
      pool.query.mockResolvedValue({ rowCount: 0 });

      const response = await request(app).delete('/reviews/5');

      expect(response.status).toBe(404);
    });
  });

  // ==========================================
  // POST /reviews/:reviewId/like
  // ==========================================
  describe('POST /reviews/:reviewId/like (Toggle Like)', () => {
    it('Deuria afegir el like si no existia (Like) - Status 200', async () => {
      // 1a Query (SELECT 1 FROM ego.resenyes_likes): No troba res (rowCount 0)
      pool.query.mockResolvedValueOnce({ rowCount: 0 });
      // 2a Query (INSERT): Ho insereix correctament
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app).post('/reviews/5/like');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ liked: true });
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('Deuria treure el like si ja existia (Unlike) - Status 200', async () => {
      // 1a Query: Troba el like existent (rowCount 1)
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      // 2a Query (DELETE): Ho elimina correctament
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app).post('/reviews/5/like');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ liked: false });
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

});