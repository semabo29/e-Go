// Gestion de usuario - pending_token
// Aqui probamos que el token temporal de registro funciona bien:
//  - crear un token con un email y luego verificarlo devuelve ese mismo email
//  - si manipulamos el token, la verificacion falla (devuelve null)

const crypto = require('crypto');
const { createPendingToken, verifyPendingToken } = require('../../lib/authHelpers');

describe('authHelpers pending_token', () => {
  test('createPendingToken y verifyPendingToken devuelven el email original', () => {
    const email = 'test@example.com';

    const token = createPendingToken(email);
    const result = verifyPendingToken(token);

    expect(result).toEqual({ email });
  });

  test('verifyPendingToken devuelve null si el token est� manipulado', () => {
    const email = 'otro@example.com';
    const token = createPendingToken(email);

    const [data] = token.split('.');
    const tokenRoto = `${data}.firma-falsa`;

    const result = verifyPendingToken(tokenRoto);

    expect(result).toBeNull();
  });

  test('verifyPendingToken devuelve null si el token expiró', () => {
    const email = 'exp@test.com';
    const token = createPendingToken(email);
    const [data] = token.split('.');
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    payload.exp = Math.floor(Date.now() / 1000) - 60;
    const newData = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const secret = process.env.GOOGLE_CLIENT_SECRET || 'pending-secret';
    const newSig = crypto.createHmac('sha256', secret).update(newData).digest('base64url');
    const expired = `${newData}.${newSig}`;
    expect(verifyPendingToken(expired)).toBeNull();
  });

  test('verifyPendingToken devuelve null con token vacío o mal formado', () => {
    expect(verifyPendingToken('')).toBeNull();
    expect(verifyPendingToken(null)).toBeNull();
    expect(verifyPendingToken('solo-una-parte')).toBeNull();
  });

  test('verifyPendingToken devuelve null si el payload no es JSON válido (firma válida)', () => {
    const secret = process.env.GOOGLE_CLIENT_SECRET || 'pending-secret';
    const data = Buffer.from('not-json{{{', 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const token = `${data}.${sig}`;
    expect(verifyPendingToken(token)).toBeNull();
  });
});

