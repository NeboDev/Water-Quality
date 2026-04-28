require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const connectMongo = require('./config/mongo');
const { connectPostgres } = require('./config/postgres');
const runMigrations = require('./config/migrations');


const app = express();
const server = http.createServer(app);

//  WebSocket montado sobre el mismo servidor HTTP 
const io = new Server(server, {
    cors: { origin: '*' }
});


app.use(express.json());


app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas de la API ───────────
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/nodos', require('./routes/nodos'));
// app.use('/api/v1/telemetria', require('./routes/telemetria'));
// app.use('/api/v1/muestras',   require('./routes/muestras'));
// app.use('/api/v1/alertas',    require('./routes/alertas'));
// app.use('/api/v1/reportes',   require('./routes/reportes'));
// app.use('/api/v1/umbrales',   require('./routes/umbrales'));

// ── Expone el io para usarlo desde cualquier parte del backend ─
app.set('io', io);

async function start() {
    await connectMongo();
    await connectPostgres();
    await runMigrations();

    server.listen(process.env.PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
    });
}

start();