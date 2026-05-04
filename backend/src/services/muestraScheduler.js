const cron = require('node-cron');
const mongoose = require('mongoose');
const { pool } = require('../config/postgres');
const { getIO } = require('./socket');


const Muestra = mongoose.models.Muestra || mongoose.model('Muestra',
    new mongoose.Schema({
        nodo_id: { type: String, required: true },
        mac: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        valores: {
            ph: Number,
            temperatura: Number,
            conductividad: Number,
            turbidez: Number,
            tds: Number
        },
        nota: { type: String, default: '' },
        registrado_por: { type: String, default: 'sistema' }
    })
);


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


// Se ejecuta en cada horario programado para todos los nodos activos
async function tomarMuestras() {
    console.log(`[Scheduler] Iniciando toma de muestras — ${new Date().toLocaleTimeString()}`);

    try {
        // Obtiene todos los nodos activos de PostgreSQL
        const nodos = await pool.query(
            'SELECT id, mac, ubicacion FROM nodos WHERE activo = TRUE'
        );

        if (nodos.rows.length === 0) {
            console.warn('[Scheduler] No hay nodos activos registrados');
            return;
        }

        for (const nodo of nodos.rows) {
            try {
                // Busca la lectura mas reciente del nodo en los ultimos 5 minutos
                // si no hay lectura reciente el nodo puede estar desconectado
                const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);

                const ultimaLectura = await Telemetria
                    .findOne({
                        nodo_id: nodo.id,
                        timestamp: { $gte: cincoMinutosAtras }
                    })
                    .sort({ timestamp: -1 })
                    .lean();

                if (!ultimaLectura) {
                    console.warn(`[Scheduler] Sin lectura reciente para nodo ${nodo.mac} — nodo posiblemente desconectado`);
                    continue;
                }

                // Guarda la lectura como muestra valida oficial
                const muestra = new Muestra({
                    nodo_id: nodo.id,
                    mac: nodo.mac,
                    valores: ultimaLectura.valores,
                    nota: `Muestra automatica — ${nodo.ubicacion}`,
                    registrado_por: 'sistema'
                });

                await muestra.save();

                console.log(`[Scheduler] Muestra registrada — MAC: ${nodo.mac} | pH: ${ultimaLectura.valores.ph}`);

                // Notifica al dashboard que se registro una muestra nueva
                try {
                    getIO().emit('muestra:nueva', {
                        nodo_id: nodo.id,
                        mac: nodo.mac,
                        ubicacion: nodo.ubicacion,
                        muestra
                    });
                } catch (e) { }

            } catch (error) {
                console.error(`[Scheduler] Error procesando nodo ${nodo.mac}:`, error.message);
            }
        }

    } catch (error) {
        console.error('[Scheduler] Error general en toma de muestras:', error.message);
    }
}

// Horarios de las 5 muestras diarias 
// Formato cron: minuto hora * * *
// Estos horarios se ajustaran cuando el ICUAP los defina formalmente
function iniciarScheduler() {
    const horarios = [
        { hora: '07:00', cron: '0 7 * * *' },
        { hora: '10:00', cron: '0 10 * * *' },
        { hora: '13:00', cron: '0 13 * * *' },
        { hora: '16:00', cron: '0 16 * * *' },
        { hora: '19:00', cron: '0 19 * * *' },
    ];

    for (const horario of horarios) {
        cron.schedule(horario.cron, tomarMuestras, {
            timezone: 'America/Mexico_City'
        });
        console.log(`[Scheduler] Muestra programada a las ${horario.hora}`);
    }

    console.log('[Scheduler] Scheduler de muestras iniciado — 5 tomas diarias');
}

module.exports = { iniciarScheduler, tomarMuestras };