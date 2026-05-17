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

  test('localLogin responde 500 en error no mapeado', async () => {
    authService.loginWithEmail.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    await authController.localLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor' });
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

  test('googleLogin responde 403 en USER_BANNED', async () => {
    authService.loginWithGoogle.mockRejectedValue({
      code: 'USER_BANNED',
      message: 'baneado',
      banned_reason: 'spam',
    });
    const res = mockRes();
    await authController.googleLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'USER_BANNED',
      error: 'baneado',
      banned_reason: 'spam',
    });
  });

  test('googleLogin sin token si needsUsername', async () => {
    authService.loginWithGoogle.mockResolvedValue({
      user: { id: 1, email: 'a@a.com', username: 'a' },
      needsUsername: true,
      pending_token: 'pt',
    });
    const res = mockRes();
    await authController.googleLogin({ body: {} }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ needsUsername: true, pending_token: 'pt' })
    );
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });

  test('localLogin responde 403 en USER_BANNED', async () => {
    authService.loginWithEmail.mockRejectedValue({
      code: 'USER_BANNED',
      message: 'cuenta bloqueada',
      banned_reason: null,
    });
    const res = mockRes();
    await authController.localLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'USER_BANNED',
      error: 'cuenta bloqueada',
      banned_reason: null,
    });
  });

  test('register responde 400 en MISSING_USERNAME', async () => {
    authService.register.mockRejectedValue({ code: 'MISSING_USERNAME', message: 'falta username' });
    const res = mockRes();
    await authController.register({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('register responde 400 en INVALID_USERNAME', async () => {
    authService.register.mockRejectedValue({ code: 'INVALID_USERNAME', message: 'username invalido' });
    const res = mockRes();
    await authController.register({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('register responde 401 en INVALID_PENDING_TOKEN', async () => {
    authService.register.mockRejectedValue({ code: 'INVALID_PENDING_TOKEN', message: 'token malo' });
    const res = mockRes();
    await authController.register({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('register responde 500 en error no mapeado', async () => {
    authService.register.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await authController.register({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('localRegister responde 400 en BAD_REQUEST', async () => {
    authService.registerWithEmail.mockRejectedValue({ code: 'BAD_REQUEST', message: 'datos invalidos' });
    const res = mockRes();
    await authController.localRegister({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('localRegister responde 409 por conflicto de username en 23505', async () => {
    authService.registerWithEmail.mockRejectedValue({ code: '23505', constraint: 'usuarios_username_key' });
    const res = mockRes();
    await authController.localRegister({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Ese nombre de usuario ya existe' });
  });

  test('localRegister responde 403 en USER_BANNED', async () => {
    authService.registerWithEmail.mockRejectedValue({
      code: 'USER_BANNED',
      message: 'no puedes registrarte',
      banned_reason: 'abuso',
    });
    const res = mockRes();
    await authController.localRegister({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'USER_BANNED',
      error: 'no puedes registrarte',
      banned_reason: 'abuso',
    });
  });

  test('localRegister responde 201 con token', async () => {
    authService.registerWithEmail.mockResolvedValue({ user: { id: 4, email: 'd@d.com', username: 'd' } });
    const res = mockRes();
    await authController.localRegister(
      { body: { email: 'd@d.com', password: '123456', username: 'd' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), token: expect.any(String) })
    );
  });

  test('adminLocalLogin responde 400 en BAD_REQUEST', async () => {
    authService.loginAdminWithEmail.mockRejectedValue({ code: 'BAD_REQUEST', message: 'falta email' });
    const res = mockRes();
    await authController.adminLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('adminLocalLogin responde 401 en INVALID_CREDENTIALS', async () => {
    authService.loginAdminWithEmail.mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'credenciales',
    });
    const res = mockRes();
    await authController.adminLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('adminLocalLogin responde 500 en error no mapeado', async () => {
    process.env.JWT_SECRET = 'secret_test';
    authService.loginAdminWithEmail.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    await authController.adminLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('companyLocalLogin sin JWT_SECRET devuelve 500', async () => {
    const prev = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    authService.loginCompanyWithEmail.mockResolvedValue({
      company: { id: 1, user_id: 2, email: 'co@test.com' },
    });
    const res = mockRes();
    await authController.companyLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    if (prev !== undefined) process.env.JWT_SECRET = prev;
  });

  test('companyLocalLogin responde 400 en BAD_REQUEST', async () => {
    authService.loginCompanyWithEmail.mockRejectedValue({ code: 'BAD_REQUEST', message: 'falta' });
    const res = mockRes();
    await authController.companyLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('companyLocalLogin devuelve token', async () => {
    process.env.JWT_SECRET = 'secret_test';
    authService.loginCompanyWithEmail.mockResolvedValue({
      company: { id: 2, user_id: 3, email: 'emp@test.com' },
    });
    const res = mockRes();
    await authController.companyLocalLogin({ body: { email: 'emp@test.com', password: 'x' } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: expect.any(String), company: expect.any(Object) })
    );
  });

  test('companyLocalLogin responde 500 en error no mapeado', async () => {
    process.env.JWT_SECRET = 'secret_test';
    authService.loginCompanyWithEmail.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    await authController.companyLocalLogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
