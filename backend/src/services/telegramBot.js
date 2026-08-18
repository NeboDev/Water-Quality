//  Notificador de Telegram
// Se llama solo cuando registrarAlerta() devuelve una alerta genuinamente
// nueva (el anti-flood de 15 min ya vive ahi). Aqui solo se agrega un
// cooldown global para no pegarle al rate limit de la Bot API si llegan
// varias alertas de distintos nodos casi al mismo tiempo.

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const COOLDOWN_GLOBAL_MS = 1500;

let colaEnvio = Promise.resolve(); // serializa los envios uno por uno

const NOMBRES_PARAMETROS = {
  ph: "pH",
  temperatura: "Temperatura",
  conductividad: "Conductividad",
  turbidez: "Turbidez",
  tds: "TDS",
};

function formatearMensaje({
  mac,
  ubicacion,
  parametro,
  valor_leido,
  valor_min,
  valor_max,
}) {
  const nombre = NOMBRES_PARAMETROS[parametro] || parametro;
  return (
    `⚠️ *Alerta Kanan — NOM-127*\n` +
    `Nodo: \`${mac}\`${ubicacion ? ` (${ubicacion})` : ""}\n` +
    `Parámetro: *${nombre}*\n` +
    `Valor leído: *${valor_leido}*\n` +
    `Rango permitido: ${valor_min} – ${valor_max}`
  );
}

async function enviarMensajeTelegram(texto) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn(
      "[Telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados — alerta no enviada",
    );
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: texto,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram respondió ${res.status}: ${body}`);
  }
}

// Encola el envio: nunca salen dos mensajes con menos de
// COOLDOWN_GLOBAL_MS de diferencia, y no bloquea al worker que la llama
function notificarAlertaTelegram(alerta) {
  const texto = formatearMensaje(alerta);

  colaEnvio = colaEnvio
    .then(() => enviarMensajeTelegram(texto))
    .catch((error) =>
      console.error("[Telegram] Error enviando alerta:", error.message),
    )
    .then(
      () => new Promise((resolve) => setTimeout(resolve, COOLDOWN_GLOBAL_MS)),
    );

  return colaEnvio;
}

module.exports = { notificarAlertaTelegram };
