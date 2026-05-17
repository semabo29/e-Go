const { pool } = require('../../lib/db');
const userPointsModel = require('../../models/userPointsModel');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
}));

describe('userPointsModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPoints', () => {
    test('devuelve puntos del conductor si existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 5, points: 120 }] });

      const result = await userPointsModel.getUserPoints(5);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT user_id as id, punts as points FROM ego.conductor WHERE user_id = $1',
        [5]
      );
      expect(result).toEqual({ usuari_id: 5, puntos_totales: 120 });
    });

    test('devuelve 0 puntos si no hay fila de conductor', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await userPointsModel.getUserPoints(99);

      expect(result).toEqual({ usuari_id: 99, puntos_totales: 0 });
    });
  });

  describe('addPoints', () => {
    test('inserta o actualiza puntos y devuelve la fila', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 3, points: 50 }] });

      const result = await userPointsModel.addPoints(3, 10);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ego.conductor'), [
        3,
        10,
      ]);
      expect(result).toEqual({ id: 3, points: 50 });
    });

    test('lanza error si no se actualizó ninguna fila', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(userPointsModel.addPoints(1, 5)).rejects.toThrow(
        'No se pudo actualizar los puntos del conductor'
      );
    });
  });

  describe('getLeaderboard', () => {
    test('devuelve filas con límite y offset por defecto', async () => {
      const rows = [{ usuari_id: 1, username: 'a', puntos_totales: 100 }];
      pool.query.mockResolvedValue({ rows });

      const result = await userPointsModel.getLeaderboard();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY c.punts DESC'), [
        10,
        0,
      ]);
      expect(result).toEqual(rows);
    });

    test('acepta límite y offset personalizados', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await userPointsModel.getLeaderboard(5, 20);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [5, 20]);
    });
  });

  describe('getUserRanking', () => {
    test('devuelve la posición del usuario', async () => {
      pool.query.mockResolvedValue({ rows: [{ posicion: '3' }] });

      const result = await userPointsModel.getUserRanking(7);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(*) + 1'), [7]);
      expect(result).toBe('3');
    });

    test('devuelve 0 si no hay resultado', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await userPointsModel.getUserRanking(7);

      expect(result).toBe(0);
    });
  });
});
