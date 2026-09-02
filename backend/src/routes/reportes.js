const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { pool } = require("../config/postgres");
const {
  generarReporte,
  inicioDelDiaMX,
  finDelDiaMX,
} = require("../services/reporteGenerator");
const { verificarToken } = require("../middleware/auth");
const { verificarRol } = require("../middleware/roles");

// ── Esquema de validación ─────────────────────────────────────
const reporteSchema = Joi.object({
  nodo_id: Joi.string().uuid().required(),
  fecha_inicio: Joi.string().isoDate().required(),
  fecha_fin: Joi.string().isoDate().required(),
});

/**
 * @swagger
 * /reportes:
 *   get:
 *     tags: [Reportes]
 *     summary: Listar todos los reportes generados (icuap, admin)
 *     responses:
 *       200:
 *         description: Lista de reportes
 *
 * /reportes/generar:
 *   post:
 *     tags: [Reportes]
 *     summary: Generar reporte PDF de cumplimiento NOM-127 (icuap, admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nodo_id, fecha_inicio, fecha_fin]
 *             properties:
 *               nodo_id:      { type: string, format: uuid }
 *               fecha_inicio: { type: string, format: date, example: '2026-04-28' }
 *               fecha_fin:    { type: string, format: date, example: '2026-04-28' }
 *     responses:
 *       200:
 *         description: PDF generado y descargado directamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /reportes/{id}:
 *   get:
 *     tags: [Reportes]
 *     summary: Metadatos de un reporte (icuap, admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Metadatos del reporte
 *
 * /reportes/{id}/pdf:
 *   get:
 *     tags: [Reportes]
 *     summary: Descargar PDF de un reporte ya registrado (icuap, admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF del reporte
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  "/",
  verificarToken,
  verificarRol("icuap", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
         r.id, r.fecha, r.cumple_nom, r.creado_en,
         n.mac, n.ubicacion,
         u.nombre as generado_por
       FROM reportes_nom127 r
       JOIN nodos n    ON r.nodo_id      = n.id
       JOIN usuarios u ON r.generado_por = u.id
       ORDER BY r.creado_en DESC`,
      );
      res.json({ total: result.rows.length, reportes: result.rows });
    } catch (error) {
      console.error("Error listando reportes:", error.message);
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  },
);

// Genera un reporte PDF y lo registra en PostgreSQL
router.post(
  "/generar",
  verificarToken,
  verificarRol("icuap", "admin"),
  async (req, res) => {
    try {
      const { error, value } = reporteSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ mensaje: error.details[0].message });
      }

      const { nodo_id, fecha_inicio, fecha_fin } = value;

      if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
        return res
          .status(400)
          .json({ mensaje: "fecha_inicio debe ser anterior a fecha_fin" });
      }

      // Fronteras del rango en hora de México, no UTC — evita que el
      // primer y último día del rango se corten a las 6pm del día previo
      const desde = inicioDelDiaMX(fecha_inicio);
      const hasta = finDelDiaMX(fecha_fin);

      const pdfBuffer = await generarReporte({
        nodo_id,
        fecha_inicio: desde,
        fecha_fin: hasta,
        generado_por: req.usuario.id,
      });

      const alertasNoResueltas = await pool.query(
        `SELECT COUNT(*) FROM alertas
       WHERE nodo_id = $1
         AND resuelta = FALSE
         AND creado_en >= $2
         AND creado_en <= $3`,
        [nodo_id, desde, hasta],
      );
      const cumple_nom = parseInt(alertasNoResueltas.rows[0].count) === 0;

      // Registra el reporte en PostgreSQL
      const reporteResult = await pool.query(
        `INSERT INTO reportes_nom127 (nodo_id, generado_por, fecha, cumple_nom)
       VALUES ($1, $2, CURRENT_DATE, $3)
       RETURNING id`,
        [nodo_id, req.usuario.id, cumple_nom],
      );

      const reporte_id = reporteResult.rows[0].id;

      // Devuelve el PDF directamente como descarga
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kanan_reporte_${reporte_id}.pdf"`,
      );
      res.setHeader("X-Reporte-Id", reporte_id);
      res.setHeader("X-Cumple-NOM", cumple_nom.toString());
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generando reporte:", error.message);
      res
        .status(500)
        .json({ mensaje: error.message || "Error interno del servidor" });
    }
  },
);

// Obtiene metadatos de un reporte especifico
router.get(
  "/:id",
  verificarToken,
  verificarRol("icuap", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
         r.id, r.fecha, r.cumple_nom, r.creado_en,
         n.mac, n.ubicacion,
         u.nombre as generado_por
       FROM reportes_nom127 r
       JOIN nodos n    ON r.nodo_id      = n.id
       JOIN usuarios u ON r.generado_por = u.id
       WHERE r.id = $1`,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: "Reporte no encontrado" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error obteniendo reporte:", error.message);
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  },
);

// Regenera y descarga el PDF de un reporte ya registrado
router.get(
  "/:id/pdf",
  verificarToken,
  verificarRol("icuap", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT r.nodo_id, r.generado_por, r.fecha
       FROM reportes_nom127 r
       WHERE r.id = $1`,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: "Reporte no encontrado" });
      }

      const { nodo_id, generado_por, fecha } = result.rows[0];

      // Antes: setHours() usaba la hora LOCAL DEL SERVIDOR (que en Docker
      // normalmente es UTC), no la de México — mismo bug, ruta distinta.
      const fecha_inicio = inicioDelDiaMX(fecha);
      const fecha_fin = finDelDiaMX(fecha);

      const pdfBuffer = await generarReporte({
        nodo_id,
        fecha_inicio,
        fecha_fin,
        generado_por,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kanan_reporte_${req.params.id}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error regenerando PDF:", error.message);
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  },
);

module.exports = router;
