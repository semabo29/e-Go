const authService = require('../services/authService');

// POST /auth/google: login con Google (code o idToken)
async function googleLogin(req, res) {
  try {
    const data = await authService.loginWithGoogle(req.body);
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

// POST /auth/register: completar registro con username (pending_token o code)
async function register(req, res) {
  try {
    const { user } = await authService.register(req.body);
    res.status(201).json({ user });
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

module.exports = {
  googleLogin,
  register,
};
