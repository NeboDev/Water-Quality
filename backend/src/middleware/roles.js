// Recibe los roles permitidos y devuelve un middleware
// Se usa asi: verificarRol('admin', 'icuap')

function verificarRol(...rolesPermitidos) {
    return (req, res, next) => {
        // req.usuario viene del middleware verificarToken
        // por eso verificarRol siempre va despues de verificarToken
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
            });
        }
        next();
    };
}

module.exports = { verificarRol };