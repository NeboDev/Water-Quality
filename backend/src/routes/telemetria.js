const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { pool } = require('../config/postgres');
const { verificarToken } = require('../middleware/auth');


// Lo definimos aqui para reutilizar el mismo esquema del worker
// mongoose.models evita redefinirlo si ya existe
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


/**
 * @swagger
 * /telemetria/live:
 *   get:
 *     tags: [Telemetría]
 *     summary: Última lectura de cada nodo activo
 *     description: Usado por el dashboard para mostrar el estado actual al cargar la página. Complementar con WebSocket para actualizaciones en tiempo real.
 *     responses:
 *       200:
 *         description: Lista con la última lectura por nodo
 *
 * /telemetria/{nodo_id}:
 *   get:
 *     tags: [Telemetría]
 *     summary: Historial de lecturas de un nodo
 *     parameters:
 *       - in: path
 *         name: nodo_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 500 }
 *     responses:
 *       200:
 *         description: Lecturas del nodo
 *
 * /telemetria/{nodo_id}/rango:
 *   get:
 *     tags: [Telemetría]
 *     summary: Lecturas de un nodo en un rango de fechas
 *     parameters:
 *       - in: path
 *         name: nodo_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: desde
 *         required: true
 *         schema: { type: string, format: date-time }
 *         example: '2026-04-28T00:00:00Z'
 *       - in: query
 *         name: hasta
 *         required: true
 *         schema: { type: string, format: date-time }
 *         example: '2026-04-28T23:59:59Z'
 *     responses:
 *       200:
 *         description: Lecturas en el rango especificado
 */
router.get('/live', verificarToken, async (req, res) => {
    try {
        // Obtiene todos los nodos activos de PostgreSQL
        const nodos = await pool.query(
            'SELECT id, mac, ubicacion FROM nodos WHERE activo = TRUE'
        );

        // Para cada nodo busca su lectura mas reciente en MongoDB
        const lecturas = await Promise.all(
            nodos.rows.map(async (nodo) => {
                const ultima = await Telemetria
                    .findOne({ nodo_id: nodo.id })
                    .sort({ timestamp: -1 })
                    .lean();

                return {
                    nodo_id: nodo.id,
                    mac: nodo.mac,
                    ubicacion: nodo.ubicacion,
                    ultima_lectura: ultima ? {
                        timestamp: ultima.timestamp,
                        valores: ultima.valores
                    } : null
                };
            })
        );

        res.json(lecturas);

    } catch (error) {
        console.error('Error obteniendo telemetria live:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Devuelve las ultimas N lecturas de un nodo especifico
// util para graficar la tendencia reciente
router.get('/:nodo_id', verificarToken, async (req, res) => {
    try {
        const { nodo_id } = req.params;

        // limit permite al cliente pedir cuantos registros quiere
        // por defecto 50 maximo 500
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);

        // Verifica que el nodo exista en PostgreSQL
        const nodo = await pool.query(
            'SELECT id, mac, ubicacion FROM nodos WHERE id = $1',
            [nodo_id]
        );
        if (nodo.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        const lecturas = await Telemetria
            .find({ nodo_id })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        res.json({
            nodo: nodo.rows[0],
            total: lecturas.length,
            lecturas
        });

    } catch (error) {
        console.error('Error obteniendo telemetría por nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Devuelve lecturas dentro de un rango de fechas
// el ICUAP lo usara para generar reportes de periodos especificos
router.get('/:nodo_id/rango', verificarToken, async (req, res) => {
    try {
        const { nodo_id } = req.params;
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({
                mensaje: 'Se requieren los parametros desde y hasta'
            });
        }

        const fechaDesde = new Date(desde);
        const fechaHasta = new Date(hasta);

        if (isNaN(fechaDesde) || isNaN(fechaHasta)) {
            return res.status(400).json({ mensaje: 'Formato de fecha invalido' });
        }

        if (fechaDesde >= fechaHasta) {
            return res.status(400).json({ mensaje: 'desde debe ser anterior a hasta' });
        }

        const lecturas = await Telemetria
            .find({
                nodo_id,
                timestamp: { $gte: fechaDesde, $lte: fechaHasta }
            })
            .sort({ timestamp: 1 })
            .lean();

        res.json({
            nodo_id,
            desde: fechaDesde,
            hasta: fechaHasta,
            total: lecturas.length,
            lecturas
        });

    } catch (error) {
        console.error('Error obteniendo telemetría por rango:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

module.exports = router;