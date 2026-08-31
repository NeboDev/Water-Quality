const mqtt = require("mqtt");

// Uso: node simulador-nodo.js <MAC> [intervalo_ms]
// La MAC puede pasarse con ':' o '-' (ej. 6C:C8:40:92:01:B4) o ya
// normalizada — este script SIEMPRE la normaliza antes de usarla,
// igual que hace normalizarMac() en routes/nodos.js. Esto es crítico:
// el nodo debe estar registrado en PostgreSQL con la MAC en formato
// canónico (sin separadores, mayúsculas), que es también el username
// que usa mqttCredentials.js y el que aparece en la regla ACL de
// Mosquitto (topic readwrite nodo/<mac>/telemetria). Si el topic no
// usa ese mismo formato exacto, el mensaje puede:
//   1) Ser rechazado por el broker si el ACL no matchea el topic, o
//   2) Llegar al worker pero no encontrar el nodo en la tabla `nodos`
//      (SELECT ... WHERE mac = $1) y descartarse silenciosamente.
function normalizarMac(mac) {
  return mac.replace(/[:\-]/g, "").toUpperCase();
}

const MAC = normalizarMac(process.argv[2] || "AA:BB:CC:DD:EE:91");
const INTERVALO = parseInt(process.argv[3]) || 8000; // default 8s -> ~7.5 msj/min, bajo el rate limit de 10/60s

const client = mqtt.connect(
  process.env.MQTT_BROKER || "mqtt://localhost:1883",
  {
    username: "AABBCCDDEE91",
    password: "W5tNwz1qkyRpvKY4oI5m",
    clientId: "simulador_" + Math.random().toString(16).substr(2, 8),
  },
);

function valorAleatorio(min, max, decimales = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimales));
}

// Valores dentro de los umbrales NOM-127 que nodos.js precarga por
// defecto al registrar un nodo nuevo:
//   ph: 6.5-8.5 | temperatura: 0-50 | conductividad: 0-1600
//   turbidez: 0-4 | tds: 0-1000
// Se deja un pequeño margen interno (no pegado a los límites exactos)
// para que la variación aleatoria no dispare alertas por redondeo.
// Si en algún momento quieres probar el flujo de alertas a propósito,
// sube el máximo de ph o turbidez por encima del umbral del nodo.
function generarLectura() {
  return {
    valores: {
      ph: valorAleatorio(6.8, 8.3),
      temperatura: valorAleatorio(15, 22),
      conductividad: valorAleatorio(200, 800),
      turbidez: valorAleatorio(0.1, 3.5),
      tds: valorAleatorio(150, 600),
    },
  };
}

client.on("connect", () => {
  console.log(
    `Simulador conectado — publicando como nodo ${MAC} cada ${INTERVALO / 1000}s`,
  );

  setInterval(() => {
    const payload = generarLectura();
    const topic = `nodo/${MAC}/telemetria`;
    client.publish(topic, JSON.stringify(payload));
    console.log(`→ ${topic}`, payload.valores);
  }, INTERVALO);
});

client.on("error", (err) => console.error("Error MQTT:", err.message));
client.on("close", () => console.warn("Conexión MQTT cerrada"));
