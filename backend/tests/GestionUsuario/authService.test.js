const authHelpers = require('../../lib/authHelpers');
const userModel = require('../../models/userModel');
const bcrypt = require('bcryptjs');
const authService = require('../../services/authService');

jest.mock('../../lib/authHelpers', () => ({
  getGooglePayload: jest.fn(),
  createPendingToken: jest.fn(),
  verifyPendingToken: jest.fn(),
}));

jest.mock('../../models/userModel', () => ({
  findByEmail: jest.fn(),
  createUser: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  createLocalUser: jest.fn(),
  setPasswordHashByUserId: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginWithGoogle', () => {
    test('lanza BAD_REQUEST si no hay idToken ni code/redirectUri', async () => {
      await expect(authService.loginWithGoogle({})).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    test('devuelve usuario existente', async () => {
      authHelpers.getGooglePayload.mockResolvedValue({ email: 'user@test.com' });
      userModel.findByEmail.mockResolvedValue({ id: 1, email: 'user@test.com' });

      const result = await authService.loginWithGoogle({ idToken: 'ok' });

      expect(result).toEqual({ user: { id: 1, email: 'user@test.com' }, needsUsername: false });
    });

    test('devuelve needsUsername cuando no existe usuario', async () => {
      authHelpers.getGooglePayload.mockResolvedValue({ email: 'new@test.com' });
      userModel.findByEmail.mockResolvedValue(null);
      authHelpers.createPendingToken.mockReturnValue('pending123');

      const result = await authService.loginWithGoogle({ idToken: 'ok' });

      expect(result).toEqual({
        needsUsername: true,
        email: 'new@test.com',
        pending_token: 'pending123',
      });
    });
  });

  describe('register', () => {
    test('lanza MISSING_USERNAME cuando falta username', async () => {
      await expect(authService.register({})).rejects.toMatchObject({ code: 'MISSING_USERNAME' });
    });

    test('lanza INVALID_PENDING_TOKEN con pending_token inválido', async () => {
      authHelpers.verifyPendingToken.mockReturnValue(null);
      await expect(
        authService.register({ pending_token: 'bad', username: 'abc' })
      ).rejects.toMatchObject({ code: 'INVALID_PENDING_TOKEN' });
    });

    test('registra usuario usando pending_token válido', async () => {
      authHelpers.verifyPendingToken.mockReturnValue({ email: 'pending@test.com' });
      userModel.createUser.mockResolvedValue({ id: 2, email: 'pending@test.com', username: 'abc' });

      const result = await authService.register({ pending_token: 'ok', username: 'abc' });
      expect(result.user.email).toBe('pending@test.com');
    });
  });

  describe('registerWithEmail', () => {
    test('lanza BAD_REQUEST con email inválido', async () => {
      await expect(
        authService.registerWithEmail({ email: 'bad-email', password: '123456', username: 'u1' })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    test('crea usuario local con password hasheada', async () => {
      bcrypt.hash.mockResolvedValue('hash123');
      userModel.findByEmailWithPassword.mockResolvedValue(null);
      userModel.createLocalUser.mockResolvedValue({ id: 4, email: 'local@test.com', username: 'local' });

      const result = await authService.registerWithEmail({
        email: 'Local@Test.com',
        password: '123456',
        username: 'local',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 12);
      expect(userModel.createLocalUser).toHaveBeenCalledWith('local@test.com', 'local', 'hash123');
      expect(result.user.id).toBe(4);
    });

    test('permite crear contraseña para usuario de Google existente', async () => {
      bcrypt.hash.mockResolvedValue('hash123');
      userModel.findByEmailWithPassword.mockResolvedValue({
        id: 14,
        email: 'google@test.com',
        username: 'googleUser',
        password_hash: null,
      });
      userModel.setPasswordHashByUserId.mockResolvedValue({
        id: 14,
        email: 'google@test.com',
        username: 'googleUser',
      });

      const result = await authService.registerWithEmail({
        email: 'google@test.com',
        password: '123456',
        username: 'newNameIgnored',
      });

      expect(userModel.setPasswordHashByUserId).toHaveBeenCalledWith(14, 'hash123');
      expect(userModel.createLocalUser).not.toHaveBeenCalled();
      expect(result.user.email).toBe('google@test.com');
    });

    test('lanza EMAIL_ALREADY_REGISTERED si el email ya tiene contraseña', async () => {
      userModel.findByEmailWithPassword.mockResolvedValue({
        id: 2,
        email: 'local@test.com',
        username: 'local',
        password_hash: 'hashExists',
      });

      await expect(
        authService.registerWithEmail({
          email: 'local@test.com',
          password: '123456',
          username: 'local',
        })
      ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
    });
  });

  describe('loginWithEmail', () => {
    test('lanza INVALID_CREDENTIALS si no existe usuario', async () => {
      userModel.findByEmailWithPassword.mockResolvedValue(null);
      await expect(
        authService.loginWithEmail({ email: 'missing@test.com', password: '123456' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    test('lanza INVALID_CREDENTIALS si compare devuelve false', async () => {
      userModel.findByEmailWithPassword.mockResolvedValue({
        id: 8,
        email: 'user@test.com',
        username: 'u',
        password_hash: 'hash',
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.loginWithEmail({ email: 'user@test.com', password: '123456' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    test('devuelve user cuando credenciales son válidas', async () => {
      userModel.findByEmailWithPassword.mockResolvedValue({
        id: 9,
        email: 'ok@test.com',
        username: 'ok',
        password_hash: 'hash',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.loginWithEmail({
        email: 'ok@test.com',
        password: '123456',
      });

      expect(result).toEqual(
        expect.objectContaining({
          needsUsername: false,
          user: expect.objectContaining({ id: 9, email: 'ok@test.com' }),
        })
      );
    });
  });
});
