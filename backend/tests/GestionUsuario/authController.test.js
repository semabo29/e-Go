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

  test('googleLogin responde 401 en INVALID_GOOGLE_TOKEN', async () => {
    authService.loginWithGoogle.mockRejectedValue({ code: 'INVALID_GOOGLE_TOKEN', message: 'bad' });
    const res = mockRes();
    await authController.googleLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('googleLogin incluye token cuando hay usuario', async () => {
    authService.loginWithGoogle.mockResolvedValue({
      user: { id: 1, email: 'a@a.com', username: 'a' },
      needsUsername: false,
    });
    const res = mockRes();
    await authController.googleLogin({ body: { idToken: 't' } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), token: expect.any(String) })
    );
  });

  test('localLogin responde 400 en BAD_REQUEST', async () => {
    authService.loginWithEmail.mockRejectedValue({ code: 'BAD_REQUEST', message: 'missing' });
    const res = mockRes();
    await authController.localLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('localLogin añade token en éxito', async () => {
    authService.loginWithEmail.mockResolvedValue({ user: { id: 2, email: 'b@b.com', username: 'b' } });
    const res = mockRes();
    await authController.localLogin({ body: { email: 'b@b.com', password: 'x' } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: expect.any(String), user: expect.any(Object) })
    );
  });

  test('register responde 201 con token', async () => {
    authService.register.mockResolvedValue({ user: { id: 3, email: 'c@c.com', username: 'c' } });
    const res = mockRes();
    await authController.register({ body: { pending_token: 't', username: 'c' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), token: expect.any(String) })
    );
  });

  test('register responde 409 por conflicto de username', async () => {
    authService.register.mockRejectedValue({ code: '23505', constraint: 'usuarios_username_key' });
    const res = mockRes();
    await authController.register({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Ese nombre de usuario ya existe' })
    );
  });

  test('adminLocalLogin sin JWT_SECRET devuelve 500', async () => {
    const prev = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    authService.loginAdminWithEmail.mockResolvedValue({
      admin: { id: 1, user_id: 2, email: 'a@a.com' },
    });
    const res = mockRes();
    await authController.adminLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    if (prev !== undefined) process.env.JWT_SECRET = prev;
  });

  test('adminLocalLogin devuelve token', async () => {
    process.env.JWT_SECRET = 'secret_test';
    authService.loginAdminWithEmail.mockResolvedValue({
      admin: { id: 1, user_id: 2, email: 'a@a.com' },
    });
    const res = mockRes();
    await authController.adminLocalLogin({ body: { email: 'a@a.com', password: 'x' } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: expect.any(String), admin: expect.any(Object) })
    );
  });

  test('companyLocalLogin responde 401 en INVALID_CREDENTIALS', async () => {
    authService.loginCompanyWithEmail.mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'no',
    });
    const res = mockRes();
    await authController.companyLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
