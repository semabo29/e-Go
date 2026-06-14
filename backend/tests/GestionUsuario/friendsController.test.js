const friendsService = require('../../services/friendsService');
const friendsController = require('../../controllers/friendsController');

jest.mock('../../services/friendsService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('friendsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriends', () => {
    test('getFriends devuelve lista de amigos del usuario', async () => {
      const mockFriends = [
        { id: 2, username: 'amic1', per_acceptar: null },
        { id: 3, username: 'amic2', per_acceptar: 3 },
      ];
      friendsService.getFriends.mockResolvedValue(mockFriends);

      const req = { query: { usuari_id: '1' } };
      const res = mockRes();

      await friendsController.getFriends(req, res);

      expect(friendsService.getFriends).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(mockFriends);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('getFriends devuelve lista vacía cuando no hay amigos', async () => {
      friendsService.getFriends.mockResolvedValue([]);

      const req = { query: { usuari_id: '5' } };
      const res = mockRes();

      await friendsController.getFriends(req, res);

      expect(friendsService.getFriends).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('getFriends responde 500 en error', async () => {
      friendsService.getFriends.mockRejectedValue(new Error('DB error'));

      const req = { query: { usuari_id: '1' } };
      const res = mockRes();

      await friendsController.getFriends(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error obteniendo amigos del usuario',
      });
    });
  });

  describe('addFriend', () => {
    test('addFriend añade un nuevo amigo correctamente', async () => {
      const mockAdded = { usuari_id1: 1, usuari_id2: 2 };
      friendsService.addFriend.mockResolvedValue(mockAdded);

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.addFriend(req, res);

      expect(friendsService.addFriend).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith(mockAdded);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('addFriend responde 400 cuando falta usuari_id1', async () => {
      const req = { query: { usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta alguno de los IDs de usuario',
      });
    });

    test('addFriend responde 400 cuando falta usuari_id2', async () => {
      const req = { query: { usuari_id1: '1' } };
      const res = mockRes();

      await friendsController.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta alguno de los IDs de usuario',
      });
    });

    test('addFriend responde 404 cuando no encuentra usuarios', async () => {
      friendsService.addFriend.mockResolvedValue(null);

      const req = { query: { usuari_id1: '999', usuari_id2: '888' } };
      const res = mockRes();

      await friendsController.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario/s no encontrado/s',
      });
    });

    test('addFriend responde 500 en error no controlado', async () => {
      friendsService.addFriend.mockRejectedValue(new Error('DB error'));

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error añadiendo amigo',
      });
    });
  });

  describe('removeFriend', () => {
    test('removeFriend elimina un amigo correctamente', async () => {
      const mockRemoved = { usuari_id1: 1, usuari_id2: 2 };
      friendsService.removeFriend.mockResolvedValue(mockRemoved);

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.removeFriend(req, res);

      expect(friendsService.removeFriend).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith(mockRemoved);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('removeFriend responde 400 cuando falta usuari_id1', async () => {
      const req = { query: { usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta alguno de los IDs de usuario',
      });
    });

    test('removeFriend responde 404 cuando no encuentra amigos', async () => {
      friendsService.removeFriend.mockResolvedValue(null);

      const req = { query: { usuari_id1: '999', usuari_id2: '888' } };
      const res = mockRes();

      await friendsController.removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario/s no encontrado/s',
      });
    });

    test('removeFriend responde 500 en error', async () => {
      friendsService.removeFriend.mockRejectedValue(new Error('DB error'));

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error eliminando amigo',
      });
    });
  });

  describe('acceptFriend', () => {
    test('acceptFriend acepta solicitud de amistad correctamente', async () => {
      const mockAccepted = { usuari_id1: 1, usuari_id2: 2, per_acceptar: null };
      friendsService.acceptFriend.mockResolvedValue(mockAccepted);

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.acceptFriend(req, res);

      expect(friendsService.acceptFriend).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith(mockAccepted);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('acceptFriend responde 400 cuando falta usuari_id1', async () => {
      const req = { query: { usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta alguno de los IDs de usuario',
      });
    });

    test('acceptFriend responde 404 cuando no encuentra solicitud', async () => {
      friendsService.acceptFriend.mockResolvedValue(null);

      const req = { query: { usuari_id1: '999', usuari_id2: '888' } };
      const res = mockRes();

      await friendsController.acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solicitud de amistad no encontrada',
      });
    });

    test('acceptFriend responde 500 en error', async () => {
      friendsService.acceptFriend.mockRejectedValue(new Error('DB error'));

      const req = { query: { usuari_id1: '1', usuari_id2: '2' } };
      const res = mockRes();

      await friendsController.acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error aceptando solicitud de amistad',
      });
    });
  });
});
