const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { pool } = require('../config/postgres');
const { verificarToken } = require('../middleware/auth');

// Joi verifica que el body tenga exactamente lo que esperamos
// antes de tocar la base de datos evitando queries innecesarios
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    rol: Joi.string().valid('admin', 'operador', 'visualizador', 'icuap').required()
});


/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Crear un nuevo usuario
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password, rol]
 *             properties:
 *               nombre:   { type: string, example: Administrador }
 *               email:    { type: string, example: admin@buap.mx }
 *               password: { type: string, example: admin123 }
 *               rol:      { type: string, enum: [admin, operador, visualizador, icuap] }
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Email ya registrado
 */
router.post('/register', async (req, res) => {
    try {
        // Valida el body contra el esquema definido arriba
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        const { nombre, email, password, rol } = value;

        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({ mensaje: 'El email ya está registrado' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, creado_en`,
            [nombre, email, password_hash, rol]
        );

        res.status(201).json({
            mensaje: 'Usuario creado correctamente',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Error en register:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión y obtener token JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@buap.mx }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: Login exitoso — devuelve token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:   { type: string }
 *                 usuario: { type: object }
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/login', async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ mensaje: error.details[0].message });
        }

        const { email, password } = value;

        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }

        const usuario = result.rows[0];

        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Establece el token como cookie HttpOnly
        // HttpOnly: JavaScript no puede leerla  protege contra XSS
        // Secure: solo viaja por HTTPS  se activa en producción
        // sameSite: lax protege contra CSRF en la mayoría de casos
        res.cookie('kanan_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas en milisegundos
        });

        // Devuelve los datos del usuario pero NO el token el token solo vive en la cookie
        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

router.post('/logout', (req, res) => {
    // Elimina la cookie estableciendo maxAge en 0
    res.cookie('kanan_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
    });
    res.json({ mensaje: 'Sesión cerrada correctamente' });
});


// React lo llama al montar la app para saber si el usuario ya tiene sesion
router.get('/me', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en /me:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

module.exports = router;