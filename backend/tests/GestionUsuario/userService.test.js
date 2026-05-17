const userModel = require('../../models/userModel');
const userService = require('../../services/userService');

jest.mock('../../models/userModel');

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getUser delega en userModel.getInfoUser', async () => {
    const row = { id: 1, username: 'pau', email: 'pau@test.com', punts: 10 };
    userModel.getInfoUser.mockResolvedValue(row);

    const result = await userService.getUser(1);

    expect(userModel.getInfoUser).toHaveBeenCalledWith(1);
    expect(result).toEqual(row);
  });

  test('getUser propaga error del modelo', async () => {
    userModel.getInfoUser.mockRejectedValue(new Error('User not found'));

    await expect(userService.getUser(999)).rejects.toThrow('User not found');
  });

  test('updateUser delega en userModel.updateUser', async () => {
    const updated = { id: 1, username: 'new', email: 'new@test.com' };
    userModel.updateUser.mockResolvedValue(updated);

    const result = await userService.updateUser(1, 'new', 'new@test.com');

    expect(userModel.updateUser).toHaveBeenCalledWith(1, 'new', 'new@test.com');
    expect(result).toEqual(updated);
  });

  test('updateUser devuelve null si el modelo no encuentra usuario', async () => {
    userModel.updateUser.mockResolvedValue(null);

    const result = await userService.updateUser(404, 'x', undefined);

    expect(result).toBeNull();
  });
});
