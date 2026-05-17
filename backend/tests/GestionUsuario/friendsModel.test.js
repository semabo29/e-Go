const { pool } = require('../../lib/db');
const friendsModel = require('../../models/friendsModel');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
  AMIGOS_TABLE: '"ego"."amics"',
}));

describe('friendsModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriends', () => {
    test('getFriends devuelve lista de amigos del usuario', async () => {
      const mockFriends = [
        { id: 2, username: 'amic1', per_acceptar: null },
        { id: 3, username: 'amic2', per_acceptar: 3 },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockFriends });

      const result = await friendsModel.getFriends(1);

      expect(result).toEqual(mockFriends);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, values] = pool.query.mock.calls[0];
      expect(query).toContain('SELECT');
      expect(query).toContain('CASE');
      expect(query).toContain('ego.amics');
      expect(query).toContain('ego.usuari');
      expect(values).toEqual([1]);
    });

    test('getFriends devuelve lista vacía cuando usuario no tiene amigos', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await friendsModel.getFriends(5);

      expect(result).toEqual([]);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [, values] = pool.query.mock.calls[0];
      expect(values).toEqual([5]);
    });

    test('getFriends maneja diferentes estructuras de amistad', async () => {
      const mockFriends = [
        { id: 2, username: 'amic1', per_acceptar: 1 }, // solicitud pendiente enviada por usuario 1
        { id: 3, username: 'amic2', per_acceptar: null }, // amistad confirmada
        { id: 4, username: 'amic3', per_acceptar: 4 }, // solicitud pendiente recibida por usuario 1
      ];
      pool.query.mockResolvedValueOnce({ rows: mockFriends });

      const result = await friendsModel.getFriends(1);

      expect(result).toEqual(mockFriends);
      expect(result).toHaveLength(3);
    });
  });

  describe('addFriend', () => {
    test('addFriend añade amigo cuando userId1 < userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 2 };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.addFriend(1, 2);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, values] = pool.query.mock.calls[0];
      expect(query).toContain('INSERT INTO');
      expect(query).toContain('amics');
      expect(query).toContain('per_acceptar');
      expect(values).toEqual([1, 2, 2]); // userId1, userId2, per_acceptar=userId2
    });

    test('addFriend invierte IDs cuando userId1 > userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 3 };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.addFriend(3, 1);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [, values] = pool.query.mock.calls[0];
      // Cuando userId1 > userId2: [userId2, userId1, userId2] = [1, 3, 1]
      expect(values).toEqual([1, 3, 1]);
    });

    test('addFriend retorna null cuando no hay resultado', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await friendsModel.addFriend(1, 2);

      expect(result).toBeUndefined(); // rows[0] de un array vacío es undefined
    });

    test('addFriend genera la query correcta', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ usuari_id1: 1, usuari_id2: 2 }] });

      await friendsModel.addFriend(1, 2);

      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('INSERT INTO');
      expect(query).toContain('usuari_id1');
      expect(query).toContain('usuari_id2');
      expect(query).toContain('RETURNING');
    });
  });

  describe('removeFriend', () => {
    test('removeFriend elimina amigo cuando userId1 < userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 2 };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.removeFriend(1, 2);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, values] = pool.query.mock.calls[0];
      expect(query).toContain('DELETE FROM');
      expect(query).toContain('amics');
      expect(values).toEqual([1, 2]);
    });

    test('removeFriend invierte IDs cuando userId1 > userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 3 };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.removeFriend(3, 1);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [, values] = pool.query.mock.calls[0];
      expect(values).toEqual([1, 3]); // IDs invertidos
    });

    test('removeFriend retorna undefined cuando no existe amistad', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await friendsModel.removeFriend(999, 888);

      expect(result).toBeUndefined();
    });

    test('removeFriend usa DELETE con WHERE correctos', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ usuari_id1: 1, usuari_id2: 2 }] });

      await friendsModel.removeFriend(1, 2);

      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('DELETE FROM');
      expect(query).toContain('WHERE usuari_id1 = $1');
      expect(query).toContain('usuari_id2 = $2');
      expect(query).toContain('RETURNING');
    });
  });

  describe('acceptFriend', () => {
    test('acceptFriend acepta solicitud cuando userId1 < userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 2, per_acceptar: null };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.acceptFriend(1, 2);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, values] = pool.query.mock.calls[0];
      expect(query).toContain('UPDATE');
      expect(query).toContain('amics');
      expect(query).toContain('per_acceptar = NULL');
      expect(values).toEqual([1, 2]);
    });

    test('acceptFriend invierte IDs cuando userId1 > userId2', async () => {
      const mockResult = { usuari_id1: 1, usuari_id2: 3, per_acceptar: null };
      pool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await friendsModel.acceptFriend(3, 1);

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [, values] = pool.query.mock.calls[0];
      expect(values).toEqual([1, 3]); // IDs invertidos
    });

    test('acceptFriend retorna undefined cuando solicitud no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await friendsModel.acceptFriend(999, 888);

      expect(result).toBeUndefined();
    });

    test('acceptFriend actualiza per_acceptar a NULL', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ usuari_id1: 1, usuari_id2: 2, per_acceptar: null }],
      });

      await friendsModel.acceptFriend(1, 2);

      const [query] = pool.query.mock.calls[0];
      expect(query).toContain('SET per_acceptar = NULL');
      expect(query).toContain('WHERE usuari_id1 = $1 AND usuari_id2 = $2');
      expect(query).toContain('RETURNING');
    });
  });
});
