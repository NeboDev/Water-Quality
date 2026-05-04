const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../config/postgres');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

const umbralSchema = Joi.object({
    ph: Joi.object({
        valor_min: Joi.number().required(),
        valor_max: Joi.number().required()
    }).optional(),
    temperatura: Joi.object({
        valor_min: Joi.number().required(),
        valor_max: Joi.number().required()
    }).optional(),
    conductividad: Joi.object({
        valor_min: Joi.number().required(),
        valor_max: Joi.number().required()
    }).optional(),
    turbidez: Joi.object({
        valor_min: Joi.number().required(),
        valor_max: Joi.number().required()
    }).optional(),
    tds: Joi.object({
        valor_min: Joi.number().required(),
        valor_max: Joi.number().required()
    }).optional()
});

/**
 * @swagger
 * /umbrales:
 *   get:
 *     tags: [Umbrales]
 *     summary: Umbrales de todos los nodos agrupados
 *     description: Devuelve los límites NOM-127 configurados por nodo. Usar para dibujar líneas de referencia en las gráficas del dashboard.
 *     responses:
 *       200:
 *         description: Umbrales agrupados por nodo
 *
 * /umbrales/{nodo_id}:
 *   get:
 *     tags: [Umbrales]
 *     summary: Umbrales de un nodo específico
 *     parameters:
 *       - in: path
 *         name: nodo_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Umbrales del nodo indexados por parámetro
 *   put:
 *     tags: [Umbrales]
 *     summary: Actualizar umbrales de un nodo (solo admin)
 *     parameters:
 *       - in: path
 *         name: nodo_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ph:
 *                 type: object
 *                 properties:
 *                   valor_min: { type: number }
 *                   valor_max: { type: number }
 *               turbidez:
 *                 type: object
 *                 properties:
 *                   valor_min: { type: number }
 *                   valor_max: { type: number }
 *     responses:
 *       200:
 *         description: Umbrales actualizados
 */
router.get('/', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
         u.id, u.parametro, u.valor_min, u.valor_max,
         n.id as nodo_id, n.mac, n.ubicacion
       FROM umbrales u
       JOIN nodos n ON u.nodo_id = n.id
       ORDER BY n.mac, u.parametro`
        );

        // Agrupa los umbrales por nodo para facilitar el consumo en el dashboard
        const agrupados = {};
        for (const row of result.rows) {
            if (!agrupados[row.nodo_id]) {
                agrupados[row.nodo_id] = {
                    nodo_id: row.nodo_id,
                    mac: row.mac,
                    ubicacion: row.ubicacion,
                    umbrales: {}
                };
            }
            agrupados[row.nodo_id].umbrales[row.parametro] = {
                id: row.id,
                valor_min: parseFloat(row.valor_min),
                valor_max: parseFloat(row.valor_max)
            };
        }

        res.json(Object.values(agrupados));

    } catch (error) {
        console.error('Error obteniendo umbrales:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Devuelve los umbrales de un nodo especifico
router.get('/:nodo_id', verificarToken, async (req, res) => {
    try {
        const { nodo_id } = req.params;

        const nodo = await pool.query(
            'SELECT id, mac, ubicacion FROM nodos WHERE id = $1',
            [nodo_id]
        );
        if (nodo.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        const umbrales = await pool.query(
            'SELECT id, parametro, valor_min, valor_max FROM umbrales WHERE nodo_id = $1 ORDER BY parametro',
            [nodo_id]
        );

        // Formatea los umbrales como objeto indexado por parametro
        // más facil de consumir en el frontend que un array o eso se supone
        const umbralMap = {};
        for (const u of umbrales.rows) {
            umbralMap[u.parametro] = {
                id: u.id,
                valor_min: parseFloat(u.valor_min),
                valor_max: parseFloat(u.valor_max)
            };
        }

        res.json({
            nodo_id: nodo.rows[0].id,
            mac: nodo.rows[0].mac,
            ubicacion: nodo.rows[0].ubicacion,
            umbrales: umbralMap
        });

    } catch (error) {
        console.error('Error obteniendo umbrales del nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Actualiza uno o varios umbrales de un nodo
router.put('/:nodo_id', verificarToken, verificarRol('admin'), async (req, res) => {
    try {
        const { error, value } = umbralSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        const { nodo_id } = req.params;

        // Verifica que el nodo exista
        const nodo = await pool.query(
            'SELECT id FROM nodos WHERE id = $1',
            [nodo_id]
        );
        if (nodo.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        if (Object.keys(value).length === 0) {
            return res.status(400).json({ mensaje: 'No se enviaron umbrales para actualizar' });
        }

        const actualizados = [];

        // Actualiza solo los parametros que llegaron en el body
        for (const [parametro, limites] of Object.entries(value)) {
            const result = await pool.query(
                `UPDATE umbrales
         SET valor_min = $1, valor_max = $2
         WHERE nodo_id = $3 AND parametro = $4
         RETURNING parametro, valor_min, valor_max`,
                [limites.valor_min, limites.valor_max, nodo_id, parametro]
            );
            if (result.rows.length > 0) {
                actualizados.push(result.rows[0]);
            }
        }

        res.json({
            mensaje: `${actualizados.length} umbral(es) actualizado(s)`,
            actualizados
        });

    } catch (error) {
        console.error('Error actualizando umbrales:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

module.exports = router;