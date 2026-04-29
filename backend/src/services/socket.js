// Singleton de Socket.io 
// Guarda la instancia de io para que cualquier parte del backend
// pueda emitir eventos sin importar el io directamente desde index.js
// Esto evita dependencias circulares entre archivos

let _io = null;

function setIO(io) {
    _io = io;
}

function getIO() {
    if (!_io) {
        throw new Error('Socket.io no ha sido inicializado todavía');
    }
    return _io;
}

module.exports = { setIO, getIO };