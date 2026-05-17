const userService = require('../../services/userService');
const { respondIfBannedUserId } = require('../../middleware/requireNotBanned');
const userController = require('../../controllers/userController');

jest.mock('../../services/userService');
jest.mock('../../middleware/requireNotBanned', () => ({
  respondIfBannedUserId: jest.fn().mockResolvedValue(false),
}));

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    respondIfBannedUserId.mockResolvedValue(false);
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
      userService.getUser.mockResolvedValue(mockUser);

      const req = { query: { usuari_id: '1' } };
      const res = mockRes();

      await userController.getUser(req, res);

      expect(userService.getUser).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(mockUser);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('no consulta si el usuario está baneado', async () => {
      respondIfBannedUserId.mockResolvedValueOnce(true);
      const res = mockRes();

      await userController.getUser({ query: { usuari_id: '5' } }, res);

      expect(userService.getUser).not.toHaveBeenCalled();
    });

    test('getUser devuelve usuario con todos los campos', async () => {
      const mockUser = {
        id: 5,
        username: 'usuari5',
        email: 'usuari5@test.com',
        punts: 250,
        created_at: '2023-06-15',
        premium: false,
        admin: false,
        empresa: true,
      };
      userService.getUser.mockResolvedValue(mockUser);

      const req = { query: { usuari_id: '5' } };
      const res = mockRes();

      await userController.getUser(req, res);

      expect(userService.getUser).toHaveBeenCalledWith('5');
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    test('getUser responde 500 en error', async () => {
      userService.getUser.mockRejectedValue(new Error('User not found'));

      const req = { query: { usuari_id: '999' } };
      const res = mockRes();

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error obteniendo información del usuario',
      });
    });

    test('getUser responde 500 en error de base de datos', async () => {
      userService.getUser.mockRejectedValue(new Error('Database connection error'));

      const req = { query: { usuari_id: '1' } };
      const res = mockRes();

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error obteniendo información del usuario',
      });
    });
  });

  describe('updateUser', () => {
    test('updateUser actualiza el username correctamente', async () => {
      const mockUpdated = {
        id: 1,
        username: 'usuariActualitzat',
        email: 'test@test.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      };
      userService.updateUser.mockResolvedValue(mockUpdated);

      const req = {
        query: { usuari_id: '1' },
        body: { username: 'usuariActualitzat' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(userService.updateUser).toHaveBeenCalledWith('1', 'usuariActualitzat');
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('updateUser responde 400 cuando falta usuari_id', async () => {
      const req = {
        query: {},
        body: { username: 'usuariActualitzat' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Falta usuari_id' });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    test('updateUser responde 400 cuando falta username', async () => {
      const req = {
        query: { usuari_id: '1' },
        body: {},
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta el campo username',
      });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    test('updateUser responde 404 cuando usuario no existe', async () => {
      userService.updateUser.mockResolvedValue(null);

      const req = {
        query: { usuari_id: '999' },
        body: { username: 'nuevo' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado',
      });
    });

    test('no actualiza si el usuario está baneado', async () => {
      respondIfBannedUserId.mockResolvedValueOnce(true);
      const res = mockRes();

      await userController.updateUser(
        { query: { usuari_id: '1' }, body: { username: 'x' } },
        res
      );

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    test('updateUser responde 500 en error no controlado', async () => {
      userService.updateUser.mockRejectedValue(new Error('Database error'));

      const req = {
        query: { usuari_id: '1' },
        body: { username: 'usuariActualitzat' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error actualizando información del usuario',
      });
    });

    test('updateUser maneja username vacío correctamente', async () => {
      const req = {
        query: { usuari_id: '1' },
        body: { username: '' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Falta el campo username',
      });
    });

    test('updateUser pasa los parámetros correctos al servicio', async () => {
      userService.updateUser.mockResolvedValue({ id: 5, username: 'usuari5' });

      const req = {
        query: { usuari_id: '5' },
        body: { username: 'usuari5' },
      };
      const res = mockRes();

      await userController.updateUser(req, res);

      expect(userService.updateUser).toHaveBeenCalledWith('5', 'usuari5');
      expect(userService.updateUser).toHaveBeenCalledTimes(1);
    });
  });
});
