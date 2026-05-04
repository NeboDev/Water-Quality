const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');


router.get('/', verificarToken, async (req, res) => {
    try {
        const { resuelta, nodo_id, parametro } = req.query;

        const condiciones = [];
        const valores = [];
        let i = 1;

        if (resuelta !== undefined) {
            condiciones.push(`a.resuelta = $${i++}`);
            valores.push(resuelta === 'true');
        }
        if (nodo_id) {
            condiciones.push(`a.nodo_id = $${i++}`);
            valores.push(nodo_id);
        }
        if (parametro) {
            condiciones.push(`a.parametro = $${i++}`);
            valores.push(parametro);
        }

        const where = condiciones.length > 0
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const result = await pool.query(
            `SELECT
         a.id, a.parametro, a.valor_leido, a.valor_min, a.valor_max,
         a.resuelta, a.creado_en,
         n.mac, n.ubicacion
       FROM alertas a
       JOIN nodos n ON a.nodo_id = n.id
       ${where}
       ORDER BY a.creado_en DESC`,
            valores
        );

        res.json({ total: result.rows.length, alertas: result.rows });

    } catch (error) {
        console.error('Error obteniendo alertas:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


router.get('/:id', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
         a.id, a.nodo_id, a.parametro, a.valor_leido,
         a.valor_min, a.valor_max, a.resuelta, a.creado_en,
         n.mac, n.ubicacion
       FROM alertas a
       JOIN nodos n ON a.nodo_id = n.id
       WHERE a.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Alerta no encontrada' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error obteniendo alerta:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});


router.put('/:id/resolver', verificarToken, verificarRol('operador', 'icuap', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE alertas
       SET resuelta = TRUE
       WHERE id = $1 AND resuelta = FALSE
       RETURNING id, parametro, valor_leido, resuelta, creado_en`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Alerta no encontrada o ya estaba resuelta'
            });
        }

        res.json({ mensaje: 'Alerta marcada como resuelta', alerta: result.rows[0] });

    } catch (error) {
        console.error('Error resolviendo alerta:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

module.exports = router;