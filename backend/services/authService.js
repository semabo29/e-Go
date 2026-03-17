// Lógica de login con Google y registro: usa authHelpers + userModel
const {
  getGooglePayload,
  createPendingToken,
  verifyPendingToken,
} = require('../lib/authHelpers');
const userModel = require('../models/userModel');

// Errores que el controller puede mapear a status
const AuthError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

async function loginWithGoogle(body) {
  const hasIdToken = !!body.idToken;
  const hasCode = !!(body.code && body.redirectUri);
  if (!hasIdToken && !hasCode) {
    throw AuthError('BAD_REQUEST', 'Envía idToken o code + redirectUri');
  }

  const payload = await getGooglePayload(body);
  if (!payload || !payload.email) {
    throw AuthError('INVALID_GOOGLE_TOKEN', 'Token de Google no válido. Envía idToken o code + redirectUri.');
  }
  const email = payload.email;

  const user = await userModel.findByEmail(email);
  if (user) {
    return { user, needsUsername: false };
  }
  const pending_token = createPendingToken(email);
  return { needsUsername: true, email, pending_token };
}

async function register(body) {
  const { username } = body;
  if (!username || typeof username !== 'string') {
    throw AuthError('MISSING_USERNAME', 'Falta username');
  }
  const name = username.trim();
  if (name.length < 2 || name.length > 100) {
    throw AuthError('INVALID_USERNAME', 'El nombre de usuario debe tener entre 2 y 100 caracteres');
  }

  let email;
  if (body.pending_token) {
    const pending = verifyPendingToken(body.pending_token);
    if (!pending) {
      throw AuthError('INVALID_PENDING_TOKEN', 'Token de registro expirado o no válido. Vuelve a iniciar sesión con Google.');
    }
    email = pending.email;
  } else {
    const payload = await getGooglePayload(body);
    if (!payload || !payload.email) {
      throw AuthError('INVALID_GOOGLE_TOKEN', 'Token de Google no válido. Envía pending_token o code + redirectUri + code_verifier.');
    }
    email = payload.email;
  }

  const user = await userModel.createUser(email, name);
  return { user };
}

module.exports = {
  loginWithGoogle,
  register,
};
