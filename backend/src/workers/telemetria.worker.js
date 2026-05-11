const { Worker } = require('bullmq');
const { connection } = require('../services/queue');
const mongoose = require('mongoose');
const { pool } = require('../config/postgres');
const { getIO } = require('../services/socket');


const Telemetria = mongoose.models.Telemetria || mongoose.model('Telemetria',
    new mongoose.Schema({
        nodo_id: { type: String, required: true },
        mac: { type: String, required: true },
        timestamp: { type: Date, default: Date.now, expires: 86400 },
        valores: {
            ph: Number,
            temperatura: Number,
            conductividad: Number,
            turbidez: Number,
            tds: Number
        }
    })
);

// Compara cada valor recibido contra los umbrales almacenados
// en PostgreSQL y devuelve la lista de parametros fuera de rango
async function validarContraUmbrales(nodo_id, valores) {
    const umbrales = await pool.query(
        'SELECT parametro, valor_min, valor_max FROM umbrales WHERE nodo_id = $1',
        [nodo_id]
    );

    const fuera = [];

    for (const umbral of umbrales.rows) {
        const valor = valores[umbral.parametro];

        // Si el sensor no mando ese parámetro lo ignoramos
        if (valor === undefined || valor === null) continue;

        if (valor < umbral.valor_min || valor > umbral.valor_max) {
            fuera.push({
                parametro: umbral.parametro,
                valor_leido: valor,
                valor_min: umbral.valor_min,
                valor_max: umbral.valor_max
            });
        }
    }

    return fuera;
}


// Guarda la alerta en PostgreSQL y aplica anti-flood
// evita registrar la misma alerta dos veces en menos de 15 minutos
async function registrarAlerta(nodo_id, anomalia) {
    // Verifica si ya existe una alerta no resuelta para este
    // parametro en los ultimos 15 minutos
    const reciente = await pool.query(
        `SELECT id FROM alertas
     WHERE nodo_id = $1
       AND parametro = $2
       AND resuelta = FALSE
       AND creado_en > NOW() - INTERVAL '15 minutes'`,
        [nodo_id, anomalia.parametro]
    );

    // Si ya hay una alerta reciente no registra otra
    if (reciente.rows.length > 0) {
        console.warn(`Anti-flood activo — alerta reciente para ${anomalia.parametro} en nodo ${nodo_id}`);
        return null;
    }

    const result = await pool.query(
        `INSERT INTO alertas (nodo_id, parametro, valor_leido, valor_min, valor_max)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, parametro, valor_leido, valor_min, valor_max, creado_en`,
        [nodo_id, anomalia.parametro, anomalia.valor_leido, anomalia.valor_min, anomalia.valor_max]
    );

    return result.rows[0];
}


const worker = new Worker('telemetria', async (job) => {
    const { mac, payload } = job.data;

    // Verifica que el nodo este registrado y activo
    const nodoResult = await pool.query(
        'SELECT id, ubicacion FROM nodos WHERE mac = $1 AND activo = TRUE',
        [mac]
    );

    if (nodoResult.rows.length === 0) {
        console.warn(`Mensaje descartado — nodo no registrado o inactivo: ${mac}`);
        return;
    }

    const nodo_id = nodoResult.rows[0].id;
    const ubicacion = nodoResult.rows[0].ubicacion;
    const { ph, temperatura, conductividad, turbidez, tds } = payload;

    // Guarda la lectura en MongoDB
    const lectura = new Telemetria({
        nodo_id,
        mac,
        valores: { ph, temperatura, conductividad, turbidez, tds }
    });
    await lectura.save();

    // Emite la lectura nueva a todos los clientes del dashboard cuando este
    const io = getIO();
    io.emit('telemetria:live', {
        nodo_id,
        mac,
        timestamp: lectura.timestamp,
        valores: lectura.valores
    });

    console.log(`Telemetria guardada — MAC: ${mac} | pH: ${ph} | Temp: ${temperatura}`);

    // Valida la lectura contra los umbrales NOM-127
    const anomalias = await validarContraUmbrales(nodo_id, { ph, temperatura, conductividad, turbidez, tds });

    if (anomalias.length > 0) {
        console.warn(`${anomalias.length} parametro(s) fuera de rango en nodo ${mac}`);


        for (const anomalia of anomalias) {
            const alerta = await registrarAlerta(nodo_id, anomalia);
            if (alerta) {
                console.warn(`Alerta registrada — ${anomalia.parametro}: ${anomalia.valor_leido} (rango: ${anomalia.valor_min}-${anomalia.valor_max})`);
                const io = getIO();
                io.emit('alertas:nueva', {
                    nodo_id,
                    mac,
                    alerta: { ...alerta, nodo_id, ubicacion: ubicacion || mac }
                });
            }
        }
    }

}, { connection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} procesado correctamente`);
});

worker.on('failed', (job, error) => {
    console.error(`Job ${job.id} fallo: ${error.message}`);
});

module.exports = worker;