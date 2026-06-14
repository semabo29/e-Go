const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Falta token de autorizacion' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'JWT_SECRET no configurado' });
    }

    try {
        const payload = jwt.verify(token, secret);

        // Guardem el payload del token (que hauria de contenir l'ID de l'usuari) dins req.user
        // Això fa que req.user.id estigui disponible al reviewsController.js
        req.user = payload;

        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Token invalido o expirado' });
    }
}

module.exports = { requireAuth };