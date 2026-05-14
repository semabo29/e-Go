describe('lib/authHelpers (Google + exchange)', () => {
  const origEnv = { ...process.env };
  const mockVerifyIdToken = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('google-auth-library', () => ({
      OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      })),
    }));
    mockVerifyIdToken.mockReset();
    process.env = { ...origEnv };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = origEnv;
  });

  async function loadAuthHelpers() {
    return require('../../lib/authHelpers');
  }

  test('sin GOOGLE_CLIENT_ID getGooglePayload con idToken devuelve null', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const ah = await loadAuthHelpers();
    expect(await ah.getGooglePayload({ idToken: 'any' })).toBeNull();
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  test('getGooglePayload con idToken verificado devuelve payload', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client';
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'g@test.com', sub: '1' }),
    });
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({ idToken: 'tok' });
    expect(p).toEqual({ email: 'g@test.com', sub: '1' });
  });

  test('getGooglePayload con idToken inválido devuelve null', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client';
    mockVerifyIdToken.mockRejectedValue(new Error('invalid'));
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({ idToken: 'bad' });
    expect(p).toBeNull();
  });

  test('getGooglePayload sin idToken ni code devuelve null', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client';
    const ah = await loadAuthHelpers();
    expect(await ah.getGooglePayload({})).toBeNull();
  });

  test('exchangeCodeForPayload sin code_verifier devuelve null', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web';
    process.env.GOOGLE_CLIENT_SECRET = 'sec';
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({
      code: 'c',
      redirectUri: 'https://app/cb',
    });
    expect(p).toBeNull();
  });

  test('exchangeCodeForPayload sin secret en env devuelve null', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web';
    delete process.env.GOOGLE_CLIENT_SECRET;
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({
      code: 'c',
      redirectUri: 'https://app/cb',
      code_verifier: 'v',
    });
    expect(p).toBeNull();
  });

  test('exchangeCodeForPayload cuando Google no devuelve id_token', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web';
    process.env.GOOGLE_CLIENT_SECRET = 'sec';
    global.fetch.mockResolvedValue({
      json: async () => ({ error: 'nope' }),
    });
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({
      code: 'c',
      redirectUri: 'https://app/cb',
      code_verifier: 'v',
    });
    expect(p).toBeNull();
  });

  test('exchangeCodeForPayload cuando fetch lanza', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web';
    process.env.GOOGLE_CLIENT_SECRET = 'sec';
    global.fetch.mockRejectedValue(new Error('network'));
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({
      code: 'c',
      redirectUri: 'https://app/cb',
      code_verifier: 'v',
    });
    expect(p).toBeNull();
  });

  test('exchangeCodeForPayload éxito: fetch id_token y verify', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web';
    process.env.GOOGLE_CLIENT_SECRET = 'sec';
    global.fetch.mockResolvedValue({
      json: async () => ({ id_token: 'idt' }),
    });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'x@test.com' }),
    });
    const ah = await loadAuthHelpers();
    const p = await ah.getGooglePayload({
      code: 'c',
      redirectUri: 'https://app/cb',
      code_verifier: 'v',
    });
    expect(p).toEqual({ email: 'x@test.com' });
    expect(global.fetch).toHaveBeenCalled();
  });
});
