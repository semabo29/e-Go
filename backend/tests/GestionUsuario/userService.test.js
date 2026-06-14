const userModel = require('../../models/userModel');
const userService = require('../../services/userService');

jest.mock('../../models/userModel');

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    test('getUser devuelve información del usuario', async () => {
      const mockUser = {
        id: 1,
        username: 'usuari123',
        email: 'test@test.com',
        punts: 100,
        created_at: '2024-01-01',
        premium: true,
        admin: false,
        empresa: false,
      };
      userModel.getInfoUser.mockResolvedValue(mockUser);

      const result = await userService.getUser(1);

      expect(result).toEqual(mockUser);
      expect(userModel.getInfoUser).toHaveBeenCalledWith(1);
    });

    test('getUser pasa el userId al modelo', async () => {
      userModel.getInfoUser.mockResolvedValue({
        id: 5,
        username: 'usuari5',
        email: 'usuari5@test.com',
        punts: 250,
        created_at: '2023-06-15',
      });

      await userService.getUser(5);

      expect(userModel.getInfoUser).toHaveBeenCalledWith(5);
      expect(userModel.getInfoUser).toHaveBeenCalledTimes(1);
    });

    test('getUser propaga error del modelo', async () => {
      userModel.getInfoUser.mockRejectedValue(new Error('User not found'));

      await expect(userService.getUser(999)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    test('updateUser actualiza el usuario correctamente', async () => {
      const mockUpdated = {
        id: 1,
        username: 'usuariActualitzat',
        email: 'test@test.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      };
      userModel.updateUser.mockResolvedValue(mockUpdated);

      const result = await userService.updateUser(1, 'usuariActualitzat');

      expect(result).toEqual(mockUpdated);
      expect(userModel.updateUser).toHaveBeenCalledWith(1, 'usuariActualitzat');
    });

    test('updateUser pasa userId y username al modelo', async () => {
      userModel.updateUser.mockResolvedValue({
        id: 5,
        username: 'usuari5',
        email: 'usuari5@test.com',
      });

      await userService.updateUser(5, 'usuari5');

      expect(userModel.updateUser).toHaveBeenCalledWith(5, 'usuari5');
      expect(userModel.updateUser).toHaveBeenCalledTimes(1);
    });

    test('updateUser devuelve null cuando usuario no existe', async () => {
      userModel.updateUser.mockResolvedValue(null);

      const result = await userService.updateUser(999, 'nuevo');

      expect(result).toBeNull();
    });

    test('updateUser propaga error del modelo', async () => {
      userModel.updateUser.mockRejectedValue(new Error('Update failed'));

      await expect(userService.updateUser(1, 'nuevo')).rejects.toThrow('Update failed');
    });

    test('updateUser retorna usuario actualizado completo', async () => {
      const mockUpdated = {
        id: 2,
        email: 'test@test.com',
        username: 'test_actualizado',
        created_at: '2024-01-01',
        updated_at: '2024-01-20',
      };
      userModel.updateUser.mockResolvedValue(mockUpdated);

      const result = await userService.updateUser(2, 'test_actualizado');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('updated_at');
      expect(result.username).toBe('test_actualizado');
    });
  });
});
