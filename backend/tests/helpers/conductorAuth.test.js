const jwt = require('jsonwebtoken');
const { signConductorToken, conductorAuthHeader } = require('./conductorAuth');

describe('conductorAuth helper', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'helper-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test('signConductorToken incluye id, email y role conductor', () => {
    const token = signConductorToken(12, { email: 'pau@test.com' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(12);
    expect(decoded.email).toBe('pau@test.com');
    expect(decoded.role).toBe('conductor');
  });

  test('signConductorToken usa test-secret por defecto si falta JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    const token = signConductorToken(3);
    const decoded = jwt.verify(token, 'test-secret');
    expect(decoded.id).toBe(3);
    expect(decoded.role).toBe('conductor');
  });

  test('conductorAuthHeader devuelve Authorization Bearer', () => {
    const headers = conductorAuthHeader(5);
    expect(headers.Authorization).toMatch(/^Bearer /);
    const token = headers.Authorization.replace('Bearer ', '');
    expect(jwt.verify(token, process.env.JWT_SECRET).id).toBe(5);
  });
});
