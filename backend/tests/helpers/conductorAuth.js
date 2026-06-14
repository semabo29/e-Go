const jwt = require('jsonwebtoken');

function signConductorToken(userId, extra = {}) {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    {
      id: userId,
      email: extra.email || `user${userId}@test.com`,
      role: 'conductor',
      ...extra,
    },
    secret,
    { expiresIn: '1h' }
  );
}

function conductorAuthHeader(userId, extra = {}) {
  return { Authorization: `Bearer ${signConductorToken(userId, extra)}` };
}

module.exports = { signConductorToken, conductorAuthHeader };
