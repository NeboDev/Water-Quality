require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cookieParser = require('cookie-parser');
const cors = require('cors');

const connectMongo = require('./config/mongo');
const { connectPostgres } = require('./config/postgres');
const runMigrations = require('./config/migrations');

const iniciarMQTT = require('./services/mqttclient');
const { iniciarScheduler } = require('./services/muestraScheduler');

const { setIO } = require('./services/socket');

const app = express();
const server = http.createServer(app);

//  WebSocket montado sobre el mismo servidor HTTP 
const io = new Server(server, {
    cors: { origin: '*' }
});

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Documentacion
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SS IOT API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1F4E79; }'
}));

// Solo den dev para zap
app.get('/swagger-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas de la API ───────────
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/nodos', require('./routes/nodos'));
app.use('/api/v1/telemetria', require('./routes/telemetria'));
app.use('/api/v1/muestras', require('./routes/muestras'));
app.use('/api/v1/alertas', require('./routes/alertas'));
app.use('/api/v1/reportes', require('./routes/reportes'));
app.use('/api/v1/umbrales', require('./routes/umbrales'));

// ── Expone el io para usarlo desde cualquier parte del backend ─
app.set('io', io);

async function start() {
    await connectMongo();
    await connectPostgres();
    await runMigrations();

    setIO(io);

    require('./workers/telemetria.worker');
    iniciarMQTT(io);
    iniciarScheduler();

    server.listen(process.env.PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
    });
}

start();