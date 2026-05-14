const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

function generateUserToken(user) {
  // Agafem la clau secreta del fitxer .env, o usem un text per defecte si falla
  const secret = process.env.JWT_SECRET || 'clau_secreta_per_defecte';
  return jwt.sign(
    { id: user.id, email: user.email, role: 'conductor' }, // Guardem la ID de l'usuari a dins!
    secret,
    { expiresIn: '30d' } // El token durarà 30 dies
  );
}

// POST /auth/google: login con Google (code o idToken)
async function googleLogin(req, res) {
  try {
    const data = await authService.loginWithGoogle(req.body);

    // SI TOT VA BÉ I TENIM USUARI, LI GENEREM EL TOKEN I L'AFEGIM A LA RESPOSTA
    if (data.user && !data.needsUsername) {
      data.token = generateUserToken(data.user);
    }

    res.json(data);
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'INVALID_GOOGLE_TOKEN') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error en /auth/google:', err);
    res.status(500).json({
      error: 'Error en el servidor',
      details: err.message,
    });
  }
}

// POST /auth/local/login
async function localLogin(req, res) {
  try {
    const data = await authService.loginWithEmail(req.body);

    // AFEGIM EL TOKEN AL LOGIN NORMAL TAMBÉ
    if (data.user) {
      data.token = generateUserToken(data.user);
    }

    res.json(data);
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error en /auth/local/login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// POST /auth/register: completar registro con username (pending_token o code)
async function register(req, res) {
  try {
    const { user } = await authService.register(req.body);
    // AFEGIM EL TOKEN AL REGISTRE
    const token = generateUserToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === 'MISSING_USERNAME' || err.code === 'INVALID_USERNAME') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'INVALID_PENDING_TOKEN' || err.code === 'INVALID_GOOGLE_TOKEN') {
      return res.status(401).json({ error: err.message });
    }
    if (err.code === '23505') {
      const msg = err.constraint?.includes('email') ? 'Este email ya está registrado' : 'Ese nombre de usuario ya existe';
      return res.status(409).json({ error: msg });
    }
    console.error('Error en /auth/register:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// POST /auth/local/register
async function localRegister(req, res) {
  try {
    const { user } = await authService.registerWithEmail(req.body);
    // AFEGIM EL TOKEN AL REGISTRE LOCAL
    const token = generateUserToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === '23505') {
      const msg = err.constraint?.includes('email')
        ? 'Este email ya está registrado'
        : 'Ese nombre de usuario ya existe';
      return res.status(409).json({ error: msg });
    }
    if (err.code === 'EMAIL_ALREADY_REGISTERED') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Error en /auth/local/register:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// POST /auth/admin/local/login — mismo JWT que /auth/admin/google
async function adminLocalLogin(req, res) {
  try {
    const data = await authService.loginAdminWithEmail(req.body);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET no configurado' });
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      {
        sub: data.admin.id,
        user_id: data.admin.user_id,
        email: data.admin.email,
        role: 'admin',
      },
      secret,
      { expiresIn }
    );
    return res.json({ admin: data.admin, token, expiresIn });
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error en /auth/admin/local/login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// POST /auth/company/local/login — mismo JWT que /auth/company/google
async function companyLocalLogin(req, res) {
  try {
    const data = await authService.loginCompanyWithEmail(req.body);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET no configurado' });
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      {
        sub: data.company.id,
        user_id: data.company.user_id,
        email: data.company.email,
        role: 'company',
      },
      secret,
      { expiresIn }
    );
    return res.json({ company: data.company, token, expiresIn });
  } catch (err) {
    if (err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error en /auth/company/local/login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  googleLogin,
  localLogin,
  adminLocalLogin,
  companyLocalLogin,
  register,
  localRegister,
};