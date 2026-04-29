const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// ── Conexión a Redis ──────────────────────────────────────────
// maxRetriesPerRequest en null es requerido por BullMQ
// sin esto BullMQ lanza un error al iniciar
const connection = new IORedis(process.env.REDIS_URI, {
    maxRetriesPerRequest: null
});

connection.on('connect', () => console.log('Redis conectado'));
connection.on('error', (err) => console.error('Error Redis:', err.message));

// ── Cola de telemetría ────────────────────────────────────────
// Cada mensaje MQTT que llega se convierte en un job en esta cola
// BullMQ garantiza que cada job se procese al menos una vez
const telemetriaQueue = new Queue('telemetria', { connection });

async function addTelemetriaQueue(data) {
    await telemetriaQueue.add('procesar', data, {
        attempts: 3,        // reintenta hasta 3 veces si falla
        backoff: {
            type: 'exponential',
            delay: 1000       // espera 1s, 2s, 4s entre reintentos
        }
    });
}

module.exports = { telemetriaQueue, addTelemetriaQueue, connection };