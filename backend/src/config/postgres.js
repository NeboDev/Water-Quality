const { Pool } = require('pg');

// Pool mantiene múltiples conexiones abiertas en lugar de
// abrir y cerrar una conexion por cada query lo que es
// mucho mas eficiente para una API con múltiples peticiones simultáneas
const pool = new Pool({
    connectionString: process.env.PG_URI
});

async function connectPostgres() {
    try {
        await pool.query('SELECT 1');
        console.log('PostgreSQL conectado');
    } catch (error) {
        console.error('Error conectando a PostgreSQL:', error.message);
        process.exit(1);
    }
}

// Exportamos tanto la funcion de conexion como el pool
// porque las rutas van a necesitar el pool para hacer queries
module.exports = { connectPostgres, pool };