const authService = require('../../services/authService');
const authController = require('../../controllers/authController');

jest.mock('../../services/authService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('googleLogin responde 400 en BAD_REQUEST', async () => {
    authService.loginWithGoogle.mockRejectedValue({ code: 'BAD_REQUEST', message: 'bad input' });
    const req = { body: {} };
    const res = mockRes();

    await authController.googleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('googleLogin responde 500 en error no mapeado', async () => {
    authService.loginWithGoogle.mockRejectedValue(new Error('boom'));
    const req = { body: {} };
    const res = mockRes();

    await authController.googleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('localLogin responde 401 en INVALID_CREDENTIALS', async () => {
    authService.loginWithEmail.mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'invalid',
    });
    const req = { body: { email: 'a', password: 'b' } };
    const res = mockRes();

    await authController.localLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('register responde 409 por conflicto de email', async () => {
    authService.register.mockRejectedValue({ code: '23505', constraint: 'usuarios_email_key' });
    const req = { body: { pending_token: 'ok', username: 'u' } };
    const res = mockRes();

    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Este email ya está registrado' }));
  });

  test('localRegister responde 500 en error no mapeado', async () => {
    authService.registerWithEmail.mockRejectedValue(new Error('boom'));
    const req = { body: { email: 'a@a.com', password: '123456', username: 'u' } };
    const res = mockRes();

    await authController.localRegister(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('localRegister responde 409 en EMAIL_ALREADY_REGISTERED', async () => {
    authService.registerWithEmail.mockRejectedValue({
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'Este email ya está registrado',
    });
    const req = { body: { email: 'a@a.com', password: '123456', username: 'u' } };
    const res = mockRes();

    await authController.localRegister(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Este email ya está registrado' });
  });
});
