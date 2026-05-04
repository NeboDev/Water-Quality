const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../config/postgres');
const mongoose = require('mongoose');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');
// Solo para pruebas - eliminar antes de produccion
const { tomarMuestras } = require('../services/muestraScheduler');

// A diferencia de telemetria estas no tienen TTL
// son el registro oficial que el ICUAP guarda
const muestraSchema = new mongoose.Schema({
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
    registrado_por: { type: String, required: true }
});

const Muestra = mongoose.models.Muestra ||
    mongoose.model('Muestra', muestraSchema);


const muestraInputSchema = Joi.object({
    nodo_id: Joi.string().uuid().required(),
    valores: Joi.object({
        ph: Joi.number().required(),
        temperatura: Joi.number().required(),
        conductividad: Joi.number().required(),
        turbidez: Joi.number().required(),
        tds: Joi.number().required()
    }).required(),
    nota: Joi.string().max(500).optional().allow('')
});


router.get('/', verificarToken, async (req, res) => {
    try {
        const { nodo_id, limit = 50 } = req.query;
        const filtro = nodo_id ? { nodo_id } : {};

        const muestras = await Muestra
            .find(filtro)
            .sort({ timestamp: -1 })
            .limit(Math.min(parseInt(limit), 500))
            .lean();

        res.json({ total: muestras.length, muestras });

    } catch (error) {
        console.error('Error obteniendo muestras:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


router.get('/:id', verificarToken, async (req, res) => {
    try {
        const muestra = await Muestra.findById(req.params.id).lean();

        if (!muestra) {
            return res.status(404).json({ mensaje: 'Muestra no encontrada' });
        }

        res.json(muestra);

    } catch (error) {
        console.error('Error obteniendo muestra:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Solo icuap y admin pueden registrar muestras oficiales tambien los nodos en un futuro
// Límite de 5 muestras por nodo por dia
router.post('/', verificarToken, verificarRol('icuap', 'admin'), async (req, res) => {
    try {
        const { error, value } = muestraInputSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        // Verifica que el nodo exista y este activo
        const nodo = await pool.query(
            'SELECT id, mac FROM nodos WHERE id = $1 AND activo = TRUE',
            [value.nodo_id]
        );
        if (nodo.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado o inactivo' });
        }


        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const muestrasHoy = await Muestra.countDocuments({
            nodo_id: value.nodo_id,
            timestamp: { $gte: hoy }
        });

        if (muestrasHoy >= 5) {
            return res.status(409).json({
                mensaje: 'Ya se registraron las 5 muestras oficiales de hoy para este nodo'
            });
        }

        const muestra = new Muestra({
            nodo_id: value.nodo_id,
            mac: nodo.rows[0].mac,
            valores: value.valores,
            nota: value.nota || '',
            registrado_por: req.usuario.id
        });

        await muestra.save();

        res.status(201).json({
            mensaje: `Muestra ${muestrasHoy + 1} de 5 registrada correctamente`,
            muestra
        });

    } catch (error) {
        console.error('Error registrando muestra:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


router.put('/:id/nota', verificarToken, verificarRol('icuap', 'admin'), async (req, res) => {
    try {
        const { nota } = req.body;

        if (!nota || typeof nota !== 'string') {
            return res.status(400).json({ mensaje: 'Se requiere el campo nota' });
        }

        const muestra = await Muestra.findByIdAndUpdate(
            req.params.id,
            { nota },
            { new: true }
        );

        if (!muestra) {
            return res.status(404).json({ mensaje: 'Muestra no encontrada' });
        }

        res.json({ mensaje: 'Nota actualizada', muestra });

    } catch (error) {
        console.error('Error actualizando nota:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

router.get('/test/forzar', verificarToken, verificarRol('admin'), async (req, res) => {
    await tomarMuestras();
    res.json({ mensaje: 'Toma de muestras ejecutada manualmente' });
});

module.exports = router;