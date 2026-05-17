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
    test('200 con información del usuario', async () => {
      const info = { id: 1, username: 'pau', email: 'pau@test.com' };
      userService.getUser.mockResolvedValue(info);
      const res = mockRes();

      await userController.getUser({ query: { usuari_id: '1' } }, res);

      expect(userService.getUser).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(info);
    });

    test('no consulta si el usuario está baneado', async () => {
      respondIfBannedUserId.mockResolvedValueOnce(true);
      const res = mockRes();

      await userController.getUser({ query: { usuari_id: '5' } }, res);

      expect(userService.getUser).not.toHaveBeenCalled();
    });

    test('500 si el servicio falla', async () => {
      userService.getUser.mockRejectedValue(new Error('db'));
      const res = mockRes();

      await userController.getUser({ query: { usuari_id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error obteniendo información del usuario',
      });
    });
  });

  describe('updateUser', () => {
    test('400 si falta usuari_id', async () => {
      const res = mockRes();

      await userController.updateUser({ query: {}, body: { username: 'a' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Falta usuari_id' });
    });

    test('400 si no hay campos para actualizar', async () => {
      const res = mockRes();

      await userController.updateUser(
        { query: { usuari_id: '1' }, body: {} },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Faltan campos para actualizar' });
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

    test('404 si el usuario no existe', async () => {
      userService.updateUser.mockResolvedValue(null);
      const res = mockRes();

      await userController.updateUser(
        { query: { usuari_id: '99' }, body: { email: 'x@test.com' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    test('200 con usuario actualizado', async () => {
      const updated = { id: 1, username: 'new', email: 'new@test.com' };
      userService.updateUser.mockResolvedValue(updated);
      const res = mockRes();

      await userController.updateUser(
        { query: { usuari_id: '1' }, body: { username: 'new', email: 'new@test.com' } },
        res
      );

      expect(userService.updateUser).toHaveBeenCalledWith('1', 'new', 'new@test.com');
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    test('500 si el servicio falla', async () => {
      userService.updateUser.mockRejectedValue(new Error('db'));
      const res = mockRes();

      await userController.updateUser(
        { query: { usuari_id: '1' }, body: { username: 'x' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error actualizando información del usuario',
      });
    });
  });
});
