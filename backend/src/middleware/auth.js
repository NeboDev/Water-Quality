const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    // El token llega en el header Authorization con formato: "Bearer <token>"
    const token = req.cookies?.kanan_token;

    if (!token) {
        return res.status(401).json({ mensaje: 'Sesión no iniciada' });
    }

    try {
        // Verifica que el token sea valido y no haya expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Guarda los datos del usuario en req para que
        // el endpoint siguiente los pueda usar sin repetir la verificacion
        req.usuario = decoded;
        next();
    } catch (error) {
        // Limpia la cookie si el token expiro o es invalido
        res.cookie('kanan_token', '', { httpOnly: true, maxAge: 0 });
        return res.status(401).json({ mensaje: 'Sesión expirada, inicia sesión nuevamente' });
    }
}

module.exports = { verificarToken };