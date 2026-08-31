const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { pool } = require("../config/postgres");
const { verificarToken } = require("../middleware/auth");
const { verificarRol } = require("../middleware/roles");
const { crearCredencialesMQTT } = require("../services/mqttCredentials");

const nodoSchema = Joi.object({
  // Acepta la MAC como venga (con ':', con '-', o sin separadores) para
  // que el admin pueda copiarla tal cual de la etiqueta del ESP32 —
  // se normaliza (sin separadores, mayúsculas) justo despues de validar.
  mac: Joi.string()
    .pattern(/^([0-9A-Fa-f]{2}[:\-]?){5}[0-9A-Fa-f]{2}$/)
    .required(),
  ubicacion: Joi.string().min(3).max(200).required(),
  version_fw: Joi.string().max(20).optional(),
});

// Formato canonico usado en TODO el sistema: sin ':' ni '-', mayusculas.
// Es el mismo valor que se usa en el topico MQTT (nodo/<mac>/telemetria),
// en el username del passwd file de Mosquitto, y en nodos.mac — al ser
// un solo formato en los tres lugares, %u del ACL vuelve a funcionar
// sin necesidad de mapeos especiales.
function normalizarMac(mac) {
  return mac.replace(/[:\-]/g, "").toUpperCase();
}

const actualizarSchema = Joi.object({
  ubicacion: Joi.string().min(3).max(200).optional(),
  version_fw: Joi.string().max(20).optional(),
  activo: Joi.boolean().optional(),
});

/**
 * @swagger
 * /nodos:
 *   get:
 *     tags: [Nodos]
 *     summary: Obtener todos los nodos registrados
 *     responses:
 *       200:
 *         description: Lista de nodos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Nodo'
 *   post:
 *     tags: [Nodos]
 *     summary: Registrar un nuevo nodo (solo admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mac, ubicacion]
 *             properties:
 *               mac:        { type: string, example: 'A4:CF:12:45:6B:2F' }
 *               ubicacion:  { type: string, example: 'Tanque norte — Rectoría' }
 *               version_fw: { type: string, example: '1.0.0' }
 *     responses:
 *       201:
 *         description: Nodo registrado con umbrales NOM-127 precargados
 *       409:
 *         description: MAC ya registrada
 */

/**
 * @swagger
 * /nodos/{id}:
 *   get:
 *     tags: [Nodos]
 *     summary: Obtener detalle de un nodo con sus umbrales
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle del nodo
 *       404:
 *         description: Nodo no encontrado
 *   put:
 *     tags: [Nodos]
 *     summary: Actualizar nodo (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ubicacion:  { type: string }
 *               version_fw: { type: string }
 *               activo:     { type: boolean }
 *     responses:
 *       200:
 *         description: Nodo actualizado
 *   delete:
 *     tags: [Nodos]
 *     summary: Eliminar nodo (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nodo eliminado
 */
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, mac, ubicacion, version_fw, activo, fecha_alta FROM nodos ORDER BY fecha_alta DESC",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo nodos:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Paso 1 del registro: crea el nodo y sus umbrales NOM-127 por defecto.
// Las credenciales MQTT se generan aparte con
// POST /nodos/:id/credenciales-mqtt (ver mas abajo) — asi, si ese paso
// falla, se puede reintentar sin tener que borrar y recrear el nodo.
router.post("/", verificarToken, verificarRol("admin"), async (req, res) => {
  try {
    const { error, value } = nodoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ mensaje: error.details[0].message });
    }

    const { mac: macCruda, ubicacion, version_fw } = value;
    const mac = normalizarMac(macCruda);

    // Verifica que la MAC no este registrada ya
    const existe = await pool.query("SELECT id FROM nodos WHERE mac = $1", [
      mac,
    ]);
    if (existe.rows.length > 0) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe un nodo con esa dirección MAC" });
    }

    const result = await pool.query(
      `INSERT INTO nodos (mac, ubicacion, version_fw)
             VALUES ($1, $2, $3)
             RETURNING id, mac, ubicacion, version_fw, activo, fecha_alta`,
      [mac, ubicacion, version_fw || null],
    );

    const nodo_id = result.rows[0].id;

    // Crear credenciales MQTT automáticamente. Si falla, no bloqueamos el
    // registro del nodo — el admin puede reintentar despues llamando a
    // POST /nodos/:id/credenciales-mqtt
    let credencialesMQTT = null;
    let credencialesError = null;
    try {
      credencialesMQTT = await crearCredencialesMQTT(nodo_id, mac);
    } catch (mqttError) {
      console.error(
        "Advertencia: No se crearon credenciales MQTT:",
        mqttError.message,
      );
      credencialesError =
        "No se pudieron generar las credenciales MQTT automáticamente. " +
        "Usa POST /nodos/" +
        nodo_id +
        "/credenciales-mqtt para reintentar.";
    }

    // Insertar umbrales NOM-127
    const umbralesNOM127 = [
      { parametro: "ph", valor_min: 6.5, valor_max: 8.5 },
      { parametro: "temperatura", valor_min: 0, valor_max: 50 },
      { parametro: "conductividad", valor_min: 0, valor_max: 1600 },
      { parametro: "turbidez", valor_min: 0, valor_max: 4 },
      { parametro: "tds", valor_min: 0, valor_max: 1000 },
    ];

    for (const u of umbralesNOM127) {
      await pool.query(
        `INSERT INTO umbrales (nodo_id, parametro, valor_min, valor_max)
                 VALUES ($1, $2, $3, $4)`,
        [nodo_id, u.parametro, u.valor_min, u.valor_max],
      );
    }

    // Respuesta unificada
    res.status(201).json({
      mensaje: "Nodo registrado correctamente",
      nodo: result.rows[0],
      mqtt: credencialesMQTT, // null si fallo — ver credenciales_error
      credenciales_error: credencialesError,
    });
  } catch (error) {
    console.error("Error registrando nodo:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Paso 2 del registro (o rotacion posterior): (re)genera las credenciales
// MQTT de un nodo ya existente. Sirve tanto para reintentar si el paso 1
// fallo, como para rotar credenciales de un nodo en produccion — cada
// llamada sobrescribe la contraseña anterior en el passwd de Mosquitto
// (crearCredencialesMQTT hace ON CONFLICT DO UPDATE sobre nodo_id).
router.post(
  "/:id/credenciales-mqtt",
  verificarToken,
  verificarRol("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const nodo = await pool.query("SELECT id, mac FROM nodos WHERE id = $1", [
        id,
      ]);
      if (nodo.rows.length === 0) {
        return res.status(404).json({ mensaje: "Nodo no encontrado" });
      }

      const credencialesMQTT = await crearCredencialesMQTT(
        id,
        nodo.rows[0].mac,
      );

      res.status(200).json({
        mensaje: "Credenciales MQTT generadas correctamente",
        mqtt: credencialesMQTT,
      });
    } catch (error) {
      console.error("Error generando credenciales MQTT:", error.message);
      res.status(500).json({
        mensaje: "Error generando credenciales MQTT",
        detalle: error.message,
      });
    }
  },
);

// Devuelve un nodo específico con sus umbrales configurados
router.get("/:id", verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const nodo = await pool.query(
      "SELECT id, mac, ubicacion, version_fw, activo, fecha_alta FROM nodos WHERE id = $1",
      [id],
    );
    if (nodo.rows.length === 0) {
      return res.status(404).json({ mensaje: "Nodo no encontrado" });
    }

    // Trae tambien los umbrales asociados al nodo en la misma respuesta
    const umbrales = await pool.query(
      "SELECT parametro, valor_min, valor_max FROM umbrales WHERE nodo_id = $1",
      [id],
    );

    res.json({
      ...nodo.rows[0],
      umbrales: umbrales.rows,
    });
  } catch (error) {
    console.error("Error obteniendo nodo:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Actualiza ubicacion version de firmware o estado activo del nodo
router.put("/:id", verificarToken, verificarRol("admin"), async (req, res) => {
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
    if (value.ubicacion !== undefined) {
      campos.push(`ubicacion = $${i++}`);
      valores.push(value.ubicacion);
    }
    if (value.version_fw !== undefined) {
      campos.push(`version_fw = $${i++}`);
      valores.push(value.version_fw);
    }
    if (value.activo !== undefined) {
      campos.push(`activo = $${i++}`);
      valores.push(value.activo);
    }

    if (campos.length === 0) {
      return res
        .status(400)
        .json({ mensaje: "No se enviaron campos para actualizar" });
    }

    valores.push(id);
    const result = await pool.query(
      `UPDATE nodos SET ${campos.join(", ")} WHERE id = $${i} RETURNING id, mac, ubicacion, version_fw, activo`,
      valores,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Nodo no encontrado" });
    }

    res.json({ mensaje: "Nodo actualizado", nodo: result.rows[0] });
  } catch (error) {
    console.error("Error actualizando nodo:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Elimina un nodo y sus umbrales
router.delete(
  "/:id",
  verificarToken,
  verificarRol("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Eliminar alertas asociadas al nodo para evitar violar la clave foránea
      await pool.query("DELETE FROM alertas WHERE nodo_id = $1", [id]);

      // 2. Eliminar reportes asociados al nodo para evitar violar la clave foránea
      await pool.query("DELETE FROM reportes_nom127 WHERE nodo_id = $1", [id]);

      // 3. Eliminar el nodo (los umbrales se eliminan solos por el ON DELETE CASCADE)
      const result = await pool.query(
        "DELETE FROM nodos WHERE id = $1 RETURNING id, mac",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: "Nodo no encontrado" });
      }

      res.json({
        mensaje: "Nodo eliminado correctamente",
        nodo: result.rows[0],
      });
    } catch (error) {
      console.error("Error eliminando nodo:", error.message);
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  },
);

module.exports = router;
