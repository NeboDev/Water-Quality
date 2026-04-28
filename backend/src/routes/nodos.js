const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../config/postgres');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');


const nodoSchema = Joi.object({
    mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).required(),
    ubicacion: Joi.string().min(3).max(200).required(),
    version_fw: Joi.string().max(20).optional()
});

const actualizarSchema = Joi.object({
    ubicacion: Joi.string().min(3).max(200).optional(),
    version_fw: Joi.string().max(20).optional(),
    activo: Joi.boolean().optional()
});

// Devuelve todos los nodos registrados
router.get('/', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, mac, ubicacion, version_fw, activo, fecha_alta FROM nodos ORDER BY fecha_alta DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo nodos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

// Devuelve un nodo específico con sus umbrales configurados
router.get('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const nodo = await pool.query(
            'SELECT id, mac, ubicacion, version_fw, activo, fecha_alta FROM nodos WHERE id = $1',
            [id]
        );
        if (nodo.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        // Trae tambien los umbrales asociados al nodo en la misma respuesta
        const umbrales = await pool.query(
            'SELECT parametro, valor_min, valor_max FROM umbrales WHERE nodo_id = $1',
            [id]
        );

        res.json({
            ...nodo.rows[0],
            umbrales: umbrales.rows
        });
    } catch (error) {
        console.error('Error obteniendo nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

// Registra un nuevo nodo en el sistema
// Solo admin puede registrar nodos
router.post('/', verificarToken, verificarRol('admin'), async (req, res) => {
    try {
        const { error, value } = nodoSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        const { mac, ubicacion, version_fw } = value;

        // Verifica que la MAC no esté registrada ya
        const existe = await pool.query(
            'SELECT id FROM nodos WHERE mac = $1',
            [mac]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe un nodo con esa dirección MAC' });
        }

        const result = await pool.query(
            `INSERT INTO nodos (mac, ubicacion, version_fw)
       VALUES ($1, $2, $3)
       RETURNING id, mac, ubicacion, version_fw, activo, fecha_alta`,
            [mac, ubicacion, version_fw || null]
        );

        // Al crear el nodo inserta automaticamente los umbrales
        // segun los limites de la NOM-127-SSA1-2021
        const nodo_id = result.rows[0].id;
        const umbralesNOM127 = [
            { parametro: 'ph', valor_min: 6.5, valor_max: 8.5 },
            { parametro: 'temperatura', valor_min: 0, valor_max: 50 },
            { parametro: 'conductividad', valor_min: 0, valor_max: 1600 },
            { parametro: 'turbidez', valor_min: 0, valor_max: 4 },
            { parametro: 'tds', valor_min: 0, valor_max: 1000 },
        ];

        for (const u of umbralesNOM127) {
            await pool.query(
                `INSERT INTO umbrales (nodo_id, parametro, valor_min, valor_max)
         VALUES ($1, $2, $3, $4)`,
                [nodo_id, u.parametro, u.valor_min, u.valor_max]
            );
        }

        res.status(201).json({
            mensaje: 'Nodo registrado correctamente con umbrales NOM-127',
            nodo: result.rows[0]
        });

    } catch (error) {
        console.error('Error registrando nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

// Actualiza ubicacion version de firmware o estado activo del nodo
router.put('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
    try {
        const { error, value } = actualizarSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        const { id } = req.params;
        const campos = [];
        const valores = [];
        let i = 1;

        // Construye el SET dinamicamente con solo los campos que llegaron
        if (value.ubicacion !== undefined) { campos.push(`ubicacion = $${i++}`); valores.push(value.ubicacion); }
        if (value.version_fw !== undefined) { campos.push(`version_fw = $${i++}`); valores.push(value.version_fw); }
        if (value.activo !== undefined) { campos.push(`activo = $${i++}`); valores.push(value.activo); }

        if (campos.length === 0) {
            return res.status(400).json({ mensaje: 'No se enviaron campos para actualizar' });
        }

        valores.push(id);
        const result = await pool.query(
            `UPDATE nodos SET ${campos.join(', ')} WHERE id = $${i} RETURNING id, mac, ubicacion, version_fw, activo`,
            valores
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        res.json({ mensaje: 'Nodo actualizado', nodo: result.rows[0] });

    } catch (error) {
        console.error('Error actualizando nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


// Elimina un nodo y sus umbrales 
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM nodos WHERE id = $1 RETURNING id, mac',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nodo no encontrado' });
        }

        res.json({ mensaje: 'Nodo eliminado correctamente', nodo: result.rows[0] });

    } catch (error) {
        console.error('Error eliminando nodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

module.exports = router;