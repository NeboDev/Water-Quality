const { Worker } = require("bullmq");
const { connection } = require("../services/queue");
const mongoose = require("mongoose");
const { pool } = require("../config/postgres");
const { getIO } = require("../services/socket");
const { notificarAlertaTelegram } = require("../services/telegramBot");

const Telemetria =
  mongoose.models.Telemetria ||
  mongoose.model(
    "Telemetria",
    new mongoose.Schema({
      nodo_id: { type: String, required: true },
      mac: { type: String, required: true },
      timestamp: { type: Date, default: Date.now, expires: 86400 },
      valores: {
        ph: Number,
        temperatura: Number,
        conductividad: Number,
        turbidez: Number,
        tds: Number,
      },
    }),
  );

const rateLimiter = new Map();
const RATE_LIMIT_MAX = 10; // maximo de mensajes permitidos por ventana
const RATE_LIMIT_VENTANA = 60 * 1000; // ventana de 60 segundos en ms (esto cambiara si el ICUAP sale con algo)

function verificarRateLimit(mac) {
  const ahora = Date.now();
  const entrada = rateLimiter.get(mac);

  if (!entrada) {
    // Primera vez que este nodo publica se inicializa su contador
    rateLimiter.set(mac, { count: 1, inicio: ahora });
    return true;
  }

  // Si la ventana de tiempo expiro reinicia el contador
  if (ahora - entrada.inicio > RATE_LIMIT_VENTANA) {
    rateLimiter.set(mac, { count: 1, inicio: ahora });
    return true;
  }

  // Si esta dentro de la ventana verifica el limite
  if (entrada.count >= RATE_LIMIT_MAX) {
    console.warn(
      `[RateLimit] Nodo ${mac} supero ${RATE_LIMIT_MAX} mensajes en 60s - descartando`,
    );
    return false;
  }

  entrada.count++;
  return true;
}

// Limpia el Map cada 5 minutos para evitar acumulacion en memoria
setInterval(
  () => {
    const ahora = Date.now();
    for (const [mac, entrada] of rateLimiter.entries()) {
      if (ahora - entrada.inicio > RATE_LIMIT_VENTANA * 2) {
        rateLimiter.delete(mac);
      }
    }
  },
  5 * 60 * 1000,
);

const RANGOS_FISICOS = {
  ph: { min: 0, max: 14 },
  temperatura: { min: -10, max: 100 },
  conductividad: { min: 0, max: 10000 },
  turbidez: { min: 0, max: 1000 },
  tds: { min: 0, max: 5000 },
};

function validarRangosFisicos(valores) {
  const errores = [];

  for (const [parametro, rango] of Object.entries(RANGOS_FISICOS)) {
    const valor = valores[parametro];

    // Si el parametro no viene en el payload lo ignoramos
    if (valor === undefined || valor === null) continue;

    // Verifica que sea un numero real
    if (typeof valor !== "number" || isNaN(valor) || !isFinite(valor)) {
      errores.push(`${parametro}: valor no numerico (${valor})`);
      continue;
    }

    // Verifica que este dentro del rango fisicamente posible
    if (valor < rango.min || valor > rango.max) {
      errores.push(
        `${parametro}: ${valor} fuera del rango fisico posible (${rango.min}-${rango.max})`,
      );
    }
  }

  return errores;
}

// Compara cada valor recibido contra los umbrales almacenados
// en PostgreSQL y devuelve la lista de parametros fuera de rango
async function validarContraUmbrales(nodo_id, valores) {
  const umbrales = await pool.query(
    "SELECT parametro, valor_min, valor_max FROM umbrales WHERE nodo_id = $1",
    [nodo_id],
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
        valor_max: umbral.valor_max,
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
    [nodo_id, anomalia.parametro],
  );

  // Si ya hay una alerta reciente no registra otra
  if (reciente.rows.length > 0) {
    console.warn(
      `Anti-flood activo — alerta reciente para ${anomalia.parametro} en nodo ${nodo_id}`,
    );
    return null;
  }

  const result = await pool.query(
    `INSERT INTO alertas (nodo_id, parametro, valor_leido, valor_min, valor_max)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, parametro, valor_leido, valor_min, valor_max, creado_en`,
    [
      nodo_id,
      anomalia.parametro,
      anomalia.valor_leido,
      anomalia.valor_min,
      anomalia.valor_max,
    ],
  );

  return result.rows[0];
}

const worker = new Worker(
  "telemetria",
  async (job) => {
    const { mac, payload } = job.data;

    if (!verificarRateLimit(mac)) {
      return;
    }

    // Verifica que el nodo este registrado y activo
    const nodoResult = await pool.query(
      "SELECT id, ubicacion FROM nodos WHERE mac = $1 AND activo = TRUE",
      [mac],
    );

    if (nodoResult.rows.length === 0) {
      console.warn(
        `Mensaje descartado — nodo no registrado o inactivo: ${mac}`,
      );
      return;
    }

    const { id: nodo_id, ubicacion } = nodoResult.rows[0];
    const { ph, temperatura, conductividad, turbidez, tds } = payload.valores;

    const erroresFisicos = validarRangosFisicos(payload.valores);
    if (erroresFisicos.length > 0) {
      console.warn(
        `[Validacion] Payload con valores imposibles desde MAC ${mac}:`,
      );
      erroresFisicos.forEach((e) => console.warn(`  - ${e}`));
      return; // descarta el mensaje sin escribir nada en la base de datos
    }

    // Guarda la lectura en MongoDB
    const lectura = new Telemetria({
      nodo_id,
      mac,
      valores: payload.valores,
    });
    await lectura.save();

    // Emite la lectura nueva a todos los clientes del dashboard cuando este
    const io = getIO();
    io.emit("telemetria:live", {
      nodo_id,
      mac,
      timestamp: lectura.timestamp,
      valores: lectura.valores,
    });

    console.log(
      `Telemetria guardada — MAC: ${mac} | pH: ${ph} | Temp: ${temperatura}`,
    );

    // Valida la lectura contra los umbrales NOM-127
    const anomalias = await validarContraUmbrales(nodo_id, {
      ph,
      temperatura,
      conductividad,
      turbidez,
      tds,
    });

    if (anomalias.length > 0) {
      console.warn(
        `${anomalias.length} parametro(s) fuera de rango en nodo ${mac}`,
      );

      for (const anomalia of anomalias) {
        const alerta = await registrarAlerta(nodo_id, anomalia);

        if (alerta) {
          console.warn(
            `Alerta registrada — ${anomalia.parametro}: ${anomalia.valor_leido} (rango: ${anomalia.valor_min}-${anomalia.valor_max})`,
          );

          const io = getIO();
          io.emit("alertas:nueva", { nodo_id, mac, alerta });

          // Try/catch propio: si Telegram falla (token mal, red caída, etc.)
          // NO debe tumbar el job ni provocar reintentos/duplicados
          try {
            await notificarAlertaTelegram({ mac, ubicacion, ...alerta });
          } catch (err) {
            console.error(
              "[Telegram] No se pudo notificar la alerta:",
              err.message,
            );
          }
        }
      }
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} procesado correctamente`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job.id} fallo: ${error.message}`);
});

module.exports = worker;
