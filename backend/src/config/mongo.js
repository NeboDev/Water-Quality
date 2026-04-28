const mongoose = require('mongoose');

// Intenta conectarse a MongoDB y detiene el proceso si falla
// porque sin base de datos el backend no tiene sentido que siga corriendo
async function connectMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB conectado');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error.message);
        process.exit(1);
    }
}

module.exports = connectMongo;