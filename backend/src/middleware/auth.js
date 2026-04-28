const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    // El token llega en el header Authorization con formato: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ mensaje: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ mensaje: 'Formato de token invalido' });
    }

    try {
        // Verifica que el token sea valido y no haya expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Guarda los datos del usuario en req para que
        // el endpoint siguiente los pueda usar sin repetir la verificacion
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token invalido o expirado' });
    }
}

module.exports = { verificarToken };