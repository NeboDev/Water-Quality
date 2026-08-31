const { execFile } = require("child_process");
const crypto = require("crypto");
const fs = require("fs").promises;
const Docker = require("dockerode");
const { pool } = require("../config/postgres");

// Ruta al passwd file y al ACL de Mosquitto, montados como volumen
// compartido con el contenedor de mosquitto
const PASSWD_FILE =
  process.env.MOSQUITTO_PASSWD_FILE || "/mosquitto-config/passwd";
const ACL_FILE = process.env.MOSQUITTO_ACL_FILE || "/mosquitto-config/acl_file";

// Nombre del contenedor de Mosquitto (debe coincidir con container_name
// en docker-compose.yml) — se usa para mandarle SIGHUP via docker-proxy
const MOSQUITTO_CONTAINER =
  process.env.MOSQUITTO_CONTAINER_NAME || "kanan_mosquitto";

// El backend NUNCA monta /var/run/docker.sock directamente (por diseño
// de seguridad — ver comentarios en docker-compose.yml). Todo acceso a
// la API de Docker pasa por el contenedor docker-proxy via TCP, que
// solo permite el endpoint POST /containers/kanan_mosquitto/kill y GET
// /version, /_ping — nada mas. Conectar aqui con `socketPath` a un
// archivo que no existe en este contenedor produce "connect ENOENT
// /var/run/docker.sock" y hace que recargarMosquitto() falle siempre,
// silenciosamente, sin tumbar el registro del nodo (las credenciales
// igual quedan bien en disco, solo que Mosquitto nunca se entera).
const DOCKER_PROXY_HOST = process.env.DOCKER_PROXY_HOST || "docker-proxy";
const DOCKER_PROXY_PORT = parseInt(process.env.DOCKER_PROXY_PORT || "2375", 10);

const docker = new Docker({
  host: DOCKER_PROXY_HOST,
  port: DOCKER_PROXY_PORT,
});

// GID del usuario "mosquitto" DENTRO del contenedor de Mosquitto (1883
// es el valor por defecto en la imagen oficial eclipse-mosquitto). Como
// los contenedores comparten el mismo namespace de UID/GID del host
// (sin userns-remap), un chown a este GID desde el contenedor del
// backend SÍ aplica correctamente para el usuario "mosquitto" que ve
// el contenedor de Mosquitto — no hace falta que el backend conozca ni
// use ese usuario, solo el número de GID.
// Configurable por si el Dockerfile de mosquitto llegara a cambiar el
// UID/GID por defecto del usuario mosquitto.
const MOSQUITTO_GID = parseInt(process.env.MOSQUITTO_GID || "1883", 10);

function generarContraseña(longitud = 20) {
  return crypto
    .randomBytes(longitud)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, longitud);
}

// Ajusta ownership/permisos de un archivo compartido con Mosquitto para
// que el proceso de Mosquitto (que corre como usuario no-root "mosquitto",
// confirmado via `ps aux` — no root) pueda releerlo en un reload por
// SIGHUP sin necesitar un restart completo del contenedor.
//
// Por qué es necesario: `mosquitto_passwd -b` reescribe el archivo
// COMPLETO en cada llamada (no lo edita in-place), adoptando el
// owner/permisos por defecto del proceso que lo ejecuta — que es el
// backend, con un UID distinto al de Mosquitto. Sin este ajuste, el
// archivo queda con un owner/grupo que el usuario "mosquitto" no puede
// leer, y la siguiente recarga via SIGHUP falla silenciosamente
// ("not authorised" en el cliente, sin error explícito en los logs de
// Mosquitto). Un restart completo del contenedor "arregla" esto de
// pura casualidad porque el entrypoint de Mosquitto normalmente corrige
// los permisos de /mosquitto/config al arrancar — pero eso tumba a
// todos los nodos conectados, justo lo que el flujo de SIGHUP buscaba
// evitar.
//
// 640 (rw para dueño y grupo, nada para "otros") en vez de 644: aunque
// el archivo solo contiene hashes (no texto plano), no hay necesidad de
// dejarlo legible por cualquier proceso del sistema si podemos
// apuntarle al grupo exacto que sí lo necesita.
async function ajustarPermisosMosquitto(rutaArchivo) {
  try {
    const stats = await fs.stat(rutaArchivo);
    // Conserva el UID actual (quien escribió el archivo — normalmente
    // el backend) y solo fuerza el GID al grupo de Mosquitto
    await fs.chown(rutaArchivo, stats.uid, MOSQUITTO_GID);
    await fs.chmod(rutaArchivo, 0o640);
  } catch (error) {
    // Si el backend no corre como root, chown a un grupo arbitrario
    // puede fallar con EPERM — lo dejamos como advertencia visible en
    // vez de tumbar el registro del nodo, pero el reload en caliente
    // seguirá fallando hasta que esto se resuelva (ej. agregar el
    // usuario del backend al grupo 1883, o correr el backend como root
    // como ya se hace hoy para el resto del flujo de credenciales MQTT)
    console.warn(
      `[Mosquitto] No se pudieron ajustar permisos de ${rutaArchivo}: ${error.message}. ` +
        `Mosquitto podría no poder releer este archivo en el próximo SIGHUP ` +
        `sin un restart completo del contenedor '${MOSQUITTO_CONTAINER}'.`,
    );
  }
}

// Usa el binario oficial de mosquitto para generar el hash correcto (PBKDF2-SHA512)
// -b = batch mode, recibe la contraseña como argumento en vez de pedirla interactivo
function escribirEnMosquittoPasswd(username, password) {
  return new Promise((resolve, reject) => {
    execFile(
      "mosquitto_passwd",
      ["-b", PASSWD_FILE, username, password],
      (error, stdout, stderr) => {
        if (error) {
          return reject(
            new Error(`mosquitto_passwd falló: ${stderr || error.message}`),
          );
        }
        resolve();
      },
    );
  });
}

// Agrega la regla de ACL para este nodo, con el mismo formato que ya
// usas a mano en acl_file:
//   user <username>
//   topic readwrite nodo/<mac>/telemetria
// Idempotente: si el usuario ya tiene una entrada, no la duplica —
// importante porque este mismo flujo se usa tanto para el registro
// inicial como para POST /nodos/:id/credenciales-mqtt (regeneracion).
async function agregarReglaACL(username, mac) {
  const contenido = await fs.readFile(ACL_FILE, "utf8").catch(() => "");

  if (contenido.includes(`user ${username}\n`)) {
    console.log(`[ACL] ${username} ya tiene una regla, no se duplica`);
    return;
  }

  const regla = `\nuser ${username}\ntopic readwrite nodo/${mac}/telemetria\n`;
  await fs.appendFile(ACL_FILE, regla);
  console.log(`[ACL] Regla agregada para ${username}`);
}

// Reinicia el contenedor de Mosquitto para que tome el passwd/ACL
// actualizados.
//
// Originalmente esto mandaba SIGHUP (reload) en vez de un restart
// completo, precisamente para no tumbar las conexiones de los nodos ya
// activos. Se comprobó experimentalmente que NO sirve para este caso:
// con los permisos del archivo confirmados correctos (owner/group
// mosquitto, modo 640) y con la señal llegando genuinamente al proceso
// correcto (verificado con `ps aux` + trap explicito en watch-reload.sh),
// un usuario recien agregado via mosquitto_passwd seguia sin poder
// autenticarse hasta un restart completo. Es una limitacion conocida de
// como Mosquitto 2.x maneja password_file/acl_file a traves del plugin
// builtin-security (ver eclipse-mosquitto/mosquitto#857, #588) — SIGHUP
// simplemente no repuebla esa tabla en memoria de forma confiable.
//
// TRADE-OFF ACEPTADO: cada alta o rotacion de credenciales de un nodo
// ahora desconecta momentaneamente a TODOS los nodos ya conectados
// (el restart tumba todas las conexiones activas). Esto es aceptable en
// desarrollo/pruebas, pero en producción con múltiples nodos activos
// es disruptivo cada vez que se da de alta un nodo nuevo. La solución
// definitiva (sin este trade-off) es migrar a Mosquitto Dynamic Security
// Plugin, que gestiona usuarios/ACLs vía mensajes de control MQTT sin
// necesitar restart ni SIGHUP en absoluto — ver trabajo futuro documentado.
//
// Si esto falla (ej. el socket de Docker no esta montado, el docker-proxy
// no permite este endpoint, o el nombre del contenedor no coincide), las
// credenciales igual quedan bien escritas en disco — solo que Mosquitto
// no las va a usar hasta un restart manual del contenedor.
async function recargarMosquitto() {
  try {
    const contenedor = docker.getContainer(MOSQUITTO_CONTAINER);
    await contenedor.restart();
    console.log(
      "[Mosquitto] Reiniciado correctamente — passwd/ACL actualizados",
    );
    return true;
  } catch (error) {
    console.error(
      `[Mosquitto] No se pudo reiniciar automáticamente: ${error.message}. ` +
        `Las credenciales ya quedaron en disco, pero Mosquitto no las va a tomar ` +
        `hasta un restart manual del contenedor '${MOSQUITTO_CONTAINER}'.`,
    );
    return false;
  }
}

async function crearCredencialesMQTT(nodo_id, mac) {
  // Username = MAC normalizada (sin ':' ni '-', mayúsculas) — mismo
  // formato que usa el tópico MQTT (nodo/<mac>/telemetria), en el
  // username del passwd file de Mosquitto, y en nodos.mac — al ser
  // un solo formato en los tres lugares, %u del ACL vuelve a funcionar
  // sin necesidad de mapeos especiales.
  // nodos.js ya normaliza antes de llamar aquí, pero se valida de nuevo
  // por si esta función se invoca desde otro lugar en el futuro —
  // el formato passwd de Mosquitto usa ':' como delimitador interno,
  // así que un username con ':' rompe el archivo, no solo el comando.
  if (/[:\s]/.test(mac)) {
    throw new Error(
      `MAC inválida para credenciales MQTT: "${mac}" contiene caracteres no permitidos (":" rompe el formato del passwd file de Mosquitto)`,
    );
  }

  const username = mac;
  const password = generarContraseña();

  // 1. Escribe en el passwd REAL que usa Mosquitto para autenticar
  await escribirEnMosquittoPasswd(username, password);

  // 1.1 Corrige ownership/permisos — mosquitto_passwd reescribe el
  //     archivo completo con el owner/permisos por defecto del backend,
  //     no los que Mosquitto (usuario no-root) necesita para releerlo
  //     en el siguiente SIGHUP
  await ajustarPermisosMosquitto(PASSWD_FILE);

  // 2. Escribe la regla de ACL — sin esto, el usuario se autentica pero
  //    Mosquitto le niega publicar/suscribirse por default-deny
  await agregarReglaACL(username, mac);

  // 2.1 Mismo ajuste de permisos para el ACL file
  await ajustarPermisosMosquitto(ACL_FILE);

  // 3. Le avisa a Mosquitto que hay cambios (SIGHUP = reload, no restart)
  const mosquittoRecargado = await recargarMosquitto();

  // 4. Guarda solo metadata en Postgres (para trazabilidad/auditoría,
  //    NUNCA guardamos la contraseña aquí — solo vive en el passwd file)
  await pool.query(
    `INSERT INTO mqtt_credenciales (nodo_id, username, generado_en)
         VALUES ($1, $2, NOW())
         ON CONFLICT (nodo_id) DO UPDATE SET username = $2, generado_en = NOW()`,
    [nodo_id, username],
  );

  console.log(`[MQTT] Usuario ${username} agregado a passwd + ACL`);

  return {
    username,
    password, // se devuelve UNA sola vez para flashear el firmware
    mensaje: "Guarda esta contraseña ahora — no volverá a mostrarse.",
    mosquitto_recargado: mosquittoRecargado,
  };
}

module.exports = { crearCredencialesMQTT, generarContraseña };
