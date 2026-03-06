// Gestion de usuario - pending_token
// Aqui probamos que el token temporal de registro funciona bien:
//  - crear un token con un email y luego verificarlo devuelve ese mismo email
//  - si manipulamos el token, la verificacion falla (devuelve null)

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
});

