// Lógica de login con Google y registro: usa authHelpers + userModel
const {
  getGooglePayload,
  createPendingToken,
  verifyPendingToken,
} = require('../lib/authHelpers');
const bcrypt = require('bcryptjs');
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

  const user = await userModel.findConductorByEmail(email);
  if (user) {
    return { user, needsUsername: false };
  }
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    await userModel.ensureConductorForUser(existingUser.id);
    return { user: existingUser, needsUsername: false };
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
  await userModel.ensureConductorForUser(user.id);
  return { user };
}

function validateLocalCredentials({ email, password, username }, requireUsername) {
  if (!email || typeof email !== 'string') {
    throw AuthError('BAD_REQUEST', 'Falta email');
  }
  if (!password || typeof password !== 'string') {
    throw AuthError('BAD_REQUEST', 'Falta password');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw AuthError('BAD_REQUEST', 'Email inválido');
  }
  if (password.length < 6) {
    throw AuthError('BAD_REQUEST', 'La contraseña debe tener al menos 6 caracteres');
  }
  let normalizedUsername = null;
  if (requireUsername) {
    if (!username || typeof username !== 'string') {
      throw AuthError('BAD_REQUEST', 'Falta username');
    }
    normalizedUsername = username.trim();
    if (normalizedUsername.length < 2 || normalizedUsername.length > 100) {
      throw AuthError('BAD_REQUEST', 'El nombre de usuario debe tener entre 2 y 100 caracteres');
    }
  }
  return { normalizedEmail, normalizedUsername };
}

async function registerWithEmail(body) {
  const { normalizedEmail, normalizedUsername } = validateLocalCredentials(body, true);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const existingUser = await userModel.findByEmailWithPassword(normalizedEmail);

  if (existingUser && existingUser.password_hash) {
    throw AuthError('EMAIL_ALREADY_REGISTERED', 'Este email ya está registrado');
  }

  if (existingUser && !existingUser.password_hash) {
    const updatedUser = await userModel.setPasswordHashByUserId(existingUser.id, passwordHash);
    if (updatedUser) {
      await userModel.ensureConductorForUser(updatedUser.id);
    }
    return { user: updatedUser };
  }

  const user = await userModel.createLocalUser(normalizedEmail, normalizedUsername, passwordHash);
  await userModel.ensureConductorForUser(user.id);
  return { user };
}

async function loginWithEmail(body) {
  const { normalizedEmail } = validateLocalCredentials(body, false);
  let user = await userModel.findConductorByEmailWithPassword(normalizedEmail);
  if (!user) {
    const existingUser = await userModel.findByEmailWithPassword(normalizedEmail);
    if (existingUser) {
      await userModel.ensureConductorForUser(existingUser.id);
      user = existingUser;
    }
  }
  if (!user || !user.password_hash) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  const ok = await bcrypt.compare(body.password, user.password_hash);
  if (!ok) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    needsUsername: false,
  };
}

async function loginAdminWithEmail(body) {
  const { normalizedEmail } = validateLocalCredentials(body, false);
  const row = await userModel.findAdminByEmailWithPassword(normalizedEmail);
  if (!row || !row.password_hash) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  const ok = await bcrypt.compare(body.password, row.password_hash);
  if (!ok) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  return {
    admin: {
      id: row.id,
      user_id: row.user_id,
      email: row.email,
      username: row.username,
      admin_since: row.admin_since,
    },
  };
}

async function loginCompanyWithEmail(body) {
  const { normalizedEmail } = validateLocalCredentials(body, false);
  const row = await userModel.findCompanyByEmailWithPassword(normalizedEmail);
  if (!row || !row.password_hash) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  const ok = await bcrypt.compare(body.password, row.password_hash);
  if (!ok) {
    throw AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  return {
    company: {
      id: row.id,
      user_id: row.user_id,
      email: row.email,
      username: row.username,
      nombre: row.nombre,
      company_since: row.company_since,
    },
  };
}

module.exports = {
  loginWithGoogle,
  loginWithEmail,
  loginAdminWithEmail,
  loginCompanyWithEmail,
  register,
  registerWithEmail,
};
