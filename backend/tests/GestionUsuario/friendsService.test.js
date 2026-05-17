const friendsModel = require('../../models/friendsModel');
const friendsService = require('../../services/friendsService');

jest.mock('../../models/friendsModel');

describe('friendsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriends', () => {
    test('getFriends devuelve lista de amigos del modelo', async () => {
      const mockFriends = [
        { id: 2, username: 'amic1', per_acceptar: null },
        { id: 3, username: 'amic2', per_acceptar: 3 },
      ];
      friendsModel.getFriends.mockResolvedValue(mockFriends);

      const result = await friendsService.getFriends(1);

      expect(result).toEqual(mockFriends);
      expect(friendsModel.getFriends).toHaveBeenCalledWith(1);
      expect(friendsModel.getFriends).toHaveBeenCalledTimes(1);
    });

    test('getFriends devuelve lista vacía cuando no hay amigos', async () => {
      friendsModel.getFriends.mockResolvedValue([]);

      const result = await friendsService.getFriends(5);

      expect(result).toEqual([]);
      expect(friendsModel.getFriends).toHaveBeenCalledWith(5);
    });

    test('getFriends propaga el error del modelo', async () => {
      friendsModel.getFriends.mockRejectedValue(new Error('DB error'));

      await expect(friendsService.getFriends(1)).rejects.toThrow('DB error');
    });
  });

  describe('addFriend', () => {
    test('addFriend llama al modelo correctamente', async () => {
      const mockAdded = { usuari_id1: 1, usuari_id2: 2 };
      friendsModel.addFriend.mockResolvedValue(mockAdded);

      const result = await friendsService.addFriend(1, 2);

      expect(result).toEqual(mockAdded);
      expect(friendsModel.addFriend).toHaveBeenCalledWith(1, 2);
      expect(friendsModel.addFriend).toHaveBeenCalledTimes(1);
    });

    test('addFriend devuelve undefined cuando el modelo no encuentra nada', async () => {
      friendsModel.addFriend.mockResolvedValue(undefined);

      const result = await friendsService.addFriend(999, 888);

      expect(result).toBeUndefined();
    });

    test('addFriend propaga error del modelo', async () => {
      friendsModel.addFriend.mockRejectedValue(new Error('Constraint error'));

      await expect(friendsService.addFriend(1, 2)).rejects.toThrow('Constraint error');
    });
  });

  describe('removeFriend', () => {
    test('removeFriend llama al modelo correctamente', async () => {
      const mockRemoved = { usuari_id1: 1, usuari_id2: 2 };
      friendsModel.removeFriend.mockResolvedValue(mockRemoved);

      const result = await friendsService.removeFriend(1, 2);

      expect(result).toEqual(mockRemoved);
      expect(friendsModel.removeFriend).toHaveBeenCalledWith(1, 2);
    });

    test('removeFriend devuelve undefined cuando no existe amistad', async () => {
      friendsModel.removeFriend.mockResolvedValue(undefined);

      const result = await friendsService.removeFriend(999, 888);

      expect(result).toBeUndefined();
    });

    test('removeFriend propaga error del modelo', async () => {
      friendsModel.removeFriend.mockRejectedValue(new Error('DB error'));

      await expect(friendsService.removeFriend(1, 2)).rejects.toThrow('DB error');
    });
  });

  describe('acceptFriend', () => {
    test('acceptFriend llama al modelo correctamente', async () => {
      const mockAccepted = { usuari_id1: 1, usuari_id2: 2, per_acceptar: null };
      friendsModel.acceptFriend.mockResolvedValue(mockAccepted);

      const result = await friendsService.acceptFriend(1, 2);

      expect(result).toEqual(mockAccepted);
      expect(friendsModel.acceptFriend).toHaveBeenCalledWith(1, 2);
    });

    test('acceptFriend devuelve undefined cuando solicitud no existe', async () => {
      friendsModel.acceptFriend.mockResolvedValue(undefined);

      const result = await friendsService.acceptFriend(999, 888);

      expect(result).toBeUndefined();
    });

    test('acceptFriend propaga error del modelo', async () => {
      friendsModel.acceptFriend.mockRejectedValue(new Error('Update error'));

      await expect(friendsService.acceptFriend(1, 2)).rejects.toThrow('Update error');
    });

    test('acceptFriend establece per_acceptar a null', async () => {
      const mockAccepted = {
        usuari_id1: 2,
        usuari_id2: 5,
        per_acceptar: null,
      };
      friendsModel.acceptFriend.mockResolvedValue(mockAccepted);

      const result = await friendsService.acceptFriend(2, 5);

      expect(result.per_acceptar).toBeNull();
    });
  });
});
