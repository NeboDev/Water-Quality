# Kanan — Backend

Sistema de monitoreo de calidad del agua en tiempo real para Ciudad Universitaria (BUAP), desarrollado para el Centro de Investigaciones en Ciencias Microbiológicas (CICM-ICUAP). "Kanan" significa _guardián_ en maya.

El sistema captura telemetría de nodos IoT (ESP32-S3) con cinco parámetros fisicoquímicos (pH, temperatura, conductividad, turbidez, TDS), la valida contra la **NOM-127-SSA1-2021**, genera alertas y reportes de cumplimiento en PDF, y expone un dashboard en tiempo real vía WebSockets.

> **Nota de alcance:** Kanan provee monitoreo continuo en los puntos de consumo de agua. No sustituye el muestreo periódico oficial del ICUAP, que opera bajo su propio marco normativo.

---

## Tabla de contenido

- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Pipeline de telemetría](#pipeline-de-telemetría-mqtt--redis--worker)
- [Autenticación y roles](#autenticación-y-roles)
- [API REST](#api-rest)
- [Gestión de credenciales MQTT y reload de Mosquitto](#gestión-de-credenciales-mqtt-y-reload-de-mosquitto)
- [Scheduler de muestras oficiales](#scheduler-de-muestras-oficiales)
- [Generación de reportes PDF](#generación-de-reportes-pdf)
- [WebSockets (tiempo real)](#websockets-tiempo-real)
- [Migraciones de base de datos](#migraciones-de-base-de-datos)
- [Documentación Swagger](#documentación-swagger)
- [Seguridad — estado actual](#seguridad--estado-actual)
- [Trabajo futuro](#trabajo-futuro)

---

## Arquitectura

El sistema sigue una arquitectura modular de cuatro capas:

1. **Percepción y captación** — Nodos ESP32-S3 (boyas) con sensores de pH, temperatura, conductividad, turbidez y TDS.
2. **Comunicación** — Broker MQTT (Mosquitto) recibe la telemetría publicada por los nodos.
3. **Lógica de negocio** — API REST en Node.js/Express, cola de mensajes (Redis + BullMQ), worker de procesamiento, motor de validación y alertas, WebSockets.
4. **Persistencia** — Modelo políglota: MongoDB (telemetría de alta frecuencia con TTL, muestras oficiales) + PostgreSQL (usuarios, nodos, umbrales, alertas, reportes).

```
ESP32 Nodo IoT → Mosquitto (MQTT) → Redis/BullMQ → Worker → MongoDB / PostgreSQL
                                                         ↓
                                                    Socket.io → Dashboard
```

Cada nodo publica de forma autónoma bajo el esquema de tópicos `nodo/{MAC}/telemetria`; el backend se suscribe con el wildcard `nodo/+/telemetria`, por lo que agregar nodos nuevos no requiere configuración adicional en el servidor.

### Aislamiento del socket de Docker

El backend necesita poder recargar Mosquitto (`SIGHUP`) cada vez que se generan o rotan credenciales MQTT, pero **nunca habla directamente con `/var/run/docker.sock`**. En su lugar:

```
backend  ──TCP──►  docker-proxy (wollomatic/socket-proxy)  ──RO──►  /var/run/docker.sock
```

- `docker-proxy` corre en una red interna dedicada (`docker_proxy_net`, `internal: true`, sin salida a internet) a la que solo el `backend` tiene acceso.
- Su allowlist es mínima: únicamente permite `GET /version`, `GET /_ping` y `POST .../containers/kanan_mosquitto/kill` (el resto del API de Docker — exec, crear/borrar contenedores, volúmenes, imágenes — está bloqueado por default).
- El backend le habla por HTTP usando `dockerode` apuntando a `host: DOCKER_PROXY_HOST, port: DOCKER_PROXY_PORT` en vez de `socketPath`.
- Si el reload falla (proxy caído, contenedor de Mosquitto renombrado, etc.), las credenciales igual quedan escritas en el `passwd`/`acl_file` en disco — solo que Mosquitto no las toma hasta el próximo reload o restart manual.

## Stack tecnológico

| Componente                   | Tecnología                                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Runtime                      | Node.js v22                                                 |
| Gestor de paquetes           | pnpm (workspace, ver `pnpm-workspace.yaml`)                 |
| Framework HTTP               | Express.js 5                                                |
| Tiempo real                  | Socket.io                                                   |
| Broker MQTT                  | Mosquitto 2                                                 |
| Cola de mensajes             | Redis 7.2 + BullMQ                                          |
| Persistencia documental      | MongoDB 7 (Mongoose)                                        |
| Persistencia relacional      | PostgreSQL 16 (`pg`)                                        |
| Autenticación                | JWT vía cookie HttpOnly                                     |
| Validación de entrada        | Joi                                                         |
| Generación de PDF            | PDFKit                                                      |
| Programación de tareas       | node-cron                                                   |
| Documentación de API         | Swagger / OpenAPI (`swagger-jsdoc` + `swagger-ui-express`)  |
| Seguridad HTTP               | `helmet` + `express-rate-limit`                             |
| Notificaciones               | Telegram Bot API (`fetch` nativo, cola serial con cooldown) |
| Gestión de credenciales MQTT | `dockerode` (vía `docker-proxy`) + `mosquitto_passwd`       |
| Contenedores                 | Docker Compose                                              |

## Estructura del proyecto

```
backend/
├── config/
│   ├── mongo.js            # Conexión a MongoDB
│   ├── postgres.js         # Pool de conexiones a PostgreSQL
│   ├── migrations.js       # Runner de migraciones versionadas (schema_migrations)
│   ├── seed.js             # Crea el usuario admin inicial si no existe ninguno
│   └── swagger.js          # Definición OpenAPI
├── migrations/
│   ├── 001_extension_uuid.js
│   ├── 002_usuarios.js
│   ├── 003_nodos.js
│   ├── 004_umbrales.js
│   ├── 005_reportes_nom127.js
│   ├── 006_alertas.js
│   ├── 007_mqtt_credenciales.js
│   └── 008_normalizar_mac_nodos.js
├── middleware/
│   ├── auth.js              # Verificación de JWT (cookie HttpOnly)
│   └── roles.js             # Verificación de rol por endpoint
├── services/
│   ├── mqttClient.js        # Cliente MQTT, encola telemetría entrante
│   ├── mqttCredentials.js   # Alta/rotación de credenciales MQTT + reload vía docker-proxy
│   ├── queue.js              # Cola BullMQ + conexión Redis
│   ├── socket.js              # Singleton de Socket.io
│   ├── muestraScheduler.js   # Cron de las 5 muestras oficiales diarias
│   ├── telegramBot.js        # Notificación de alertas por Telegram
│   └── reporteGenerator.js   # Generación de PDF de cumplimiento NOM-127
├── workers/
│   └── telemetria.worker.js  # Procesa jobs de la cola: valida y persiste
├── routes/
│   ├── auth.js
│   ├── nodos.js
│   ├── telemetria.js
│   ├── muestras.js
│   ├── alertas.js
│   ├── umbrales.js
│   └── reportes.js
└── index.js                  # Punto de entrada: bootstrap del servidor
```

## Modelo de datos

### PostgreSQL (relacional, auditable)

| Tabla               | Propósito                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usuarios`          | Cuentas del sistema. Rol: `admin`, `operador`, `visualizador`, `icuap`.                                                                                         |
| `nodos`             | Directorio de nodos ESP32 (MAC única normalizada, ubicación, firmware, estado activo).                                                                          |
| `umbrales`          | Límites `valor_min` / `valor_max` por nodo y parámetro (NOM-127). **Fuente única de verdad**, consultada tanto por el worker como por el generador de reportes. |
| `alertas`           | Anomalías detectadas: parámetro, valor leído, rango violado, estado de resolución.                                                                              |
| `reportes_nom127`   | Metadatos de reportes PDF generados (nodo, periodo, usuario, cumplimiento).                                                                                     |
| `mqtt_credenciales` | Metadata de las credenciales MQTT emitidas por nodo (usuario, fecha) — **nunca guarda la contraseña**, esa solo vive en el `passwd` de Mosquitto.               |
| `schema_migrations` | Registro de qué migraciones ya se aplicaron y cuándo (versionado real del esquema).                                                                             |

### MongoDB (documental, alta frecuencia)

| Colección    | Propósito                                                                        |
| ------------ | -------------------------------------------------------------------------------- |
| `telemetria` | Lecturas crudas en tiempo real. Índice **TTL de 86 400 s (24 h)**.               |
| `muestras`   | Registro oficial (automático o manual) sin expiración — historial para el ICUAP. |

Ambos motores se enlazan mediante el UUID del nodo (`nodo_id`), generado en PostgreSQL.

## Puesta en marcha

### Requisitos

- Node.js v22+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop (Compose v5+)

### Pasos

```bash
# 1. Levantar infraestructura (Postgres, Mongo, Redis, Mosquitto, docker-proxy)
docker compose up -d --build

# 2. Instalar dependencias del backend
pnpm install

# 3. Configurar variables de entorno (ver sección siguiente)
cp .env.example .env

# 4. Iniciar el backend
pnpm run dev
```

> El backend corre dentro de su propio contenedor (`build: ./backend`, imagen basada en `node:22-alpine`). Si solo cambiaste código en `src/`, necesitas reconstruir la imagen (`docker compose up -d --build backend`) para que el contenedor lo tome — actualmente **no hay bind mount** del código fuente, así que no hay hot-reload dentro del contenedor por defecto.

Al iniciar, `index.js` sigue esta secuencia estricta para evitar condiciones de carrera:

1. Conecta a MongoDB
2. Conecta a PostgreSQL
3. Ejecuta migraciones pendientes (`runMigrations`, versionadas vía `schema_migrations`)
4. Inicializa el singleton de Socket.io
5. Registra el worker de telemetría
6. Inicia el cliente MQTT
7. Activa el scheduler de muestras
8. El servidor HTTP empieza a aceptar peticiones

## Variables de entorno

| Variable                                          | Descripción                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                                            | Puerto del servidor HTTP/WebSocket                                                     |
| `MONGO_URI`                                       | Cadena de conexión a MongoDB                                                           |
| `PG_URI`                                          | Cadena de conexión a PostgreSQL                                                        |
| `REDIS_URI`                                       | Cadena de conexión a Redis                                                             |
| `MQTT_BROKER`                                     | URL del broker Mosquitto (ej. `mqtt://mosquitto:1883`)                                 |
| `MQTT_USER` / `MQTT_PASSWORD`                     | Credenciales del cliente MQTT del backend                                              |
| `JWT_SECRET`                                      | Secreto para firmar tokens JWT                                                         |
| `NODE_ENV`                                        | `development` / `production` (afecta la flag `secure` de la cookie)                    |
| `MOSQUITTO_PASSWD_FILE`                           | Ruta al `passwd` de Mosquitto montado como volumen compartido                          |
| `MOSQUITTO_ACL_FILE`                              | Ruta al `acl_file` de Mosquitto montado como volumen compartido                        |
| `MOSQUITTO_CONTAINER_NAME`                        | Nombre fijo del contenedor de Mosquitto (`kanan_mosquitto`)                            |
| `DOCKER_PROXY_HOST`                               | Host del contenedor `docker-proxy` (para el reload por `SIGHUP`)                       |
| `DOCKER_PROXY_PORT`                               | Puerto del `docker-proxy` (por defecto `2375`)                                         |
| `TELEGRAM_BOT_TOKEN`                              | Token del bot de Telegram para notificar alertas                                       |
| `TELEGRAM_CHAT_ID`                                | Chat/canal destino de las notificaciones de alertas                                    |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NOMBRE` | Credenciales del usuario admin inicial, creado por `seed.js` si no existe ningún admin |

## Pipeline de telemetría (MQTT → Redis → Worker)

1. **Recepción MQTT** (`mqttClient.js`): el cliente se suscribe a `nodo/+/telemetria`. Al recibir un mensaje, extrae la MAC del tópico, parsea el JSON y encola la tarea en BullMQ. Si el payload es inválido, se descarta silenciosamente (con log) — el cliente MQTT **nunca procesa**, solo recibe y encola, garantizando que ningún mensaje se pierda aunque el worker esté ocupado.

2. **Cola** (`queue.js`): cada mensaje se encola con `attempts: 3` y backoff exponencial (1 s, 2 s, 4 s).

   > Como los jobs se reintentan hasta 3 veces, cualquier efecto secundario (ej. notificación por Telegram) debe quedar **estrictamente delimitado** dentro del bloque `if (alerta)` del worker — de lo contrario, un reintento por fallo transitorio puede duplicar notificaciones o escrituras.

3. **Worker** (`telemetria.worker.js`) aplica un pipeline de validación de **cinco niveles** antes de persistir cualquier lectura:

   | #   | Validación                                                                                                                         | Efecto si falla                                        |
   | --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
   | 1   | **Rate limit** — máx. 10 mensajes/nodo por ventana de 60 s (actualmente en memoria, `Map`; no persiste entre reinicios del worker) | Job descartado                                         |
   | 2   | **Nodo registrado y activo** en PostgreSQL                                                                                         | Job descartado                                         |
   | 3   | **Rangos físicos posibles** por parámetro (ver tabla abajo)                                                                        | Job descartado, nada se escribe                        |
   | 4   | **Umbrales NOM-127** (tabla `umbrales`, por nodo)                                                                                  | Se genera una alerta por cada parámetro fuera de rango |
   | 5   | **Anti-flood de alertas** — no repetir la misma alerta (nodo + parámetro) en menos de 15 minutos                                   | La alerta duplicada no se registra                     |

   Rangos físicos (nivel 3):

   | Parámetro     | Rango físico | Unidad                      |
   | ------------- | ------------ | --------------------------- |
   | pH            | 0–14         | —                           |
   | Temperatura   | -10–100      | °C                          |
   | Conductividad | 0–10 000     | µS/cm                       |
   | Turbidez      | 0–1 000      | — (ver nota de calibración) |
   | TDS           | 0–5 000      | mg/L                        |

4. **Persistencia y emisión**: la lectura válida se guarda en MongoDB (`telemetria`) y se emite por Socket.io (`telemetria:live`) para actualizar el dashboard sin recargar. Si hay anomalías, se registra la alerta en PostgreSQL y se emite `alertas:nueva`.

## Autenticación y roles

- **Login** (`POST /api/v1/auth/login`): valida credenciales con bcrypt, firma un JWT (`{ id, rol }`, expira en 8 h) y lo entrega como **cookie HttpOnly** (`kanan_token`) — nunca en el cuerpo de la respuesta, para mitigar XSS.
- **Middleware `verificarToken`**: lee la cookie, verifica el JWT y expone `req.usuario`. Si expira o es inválida, limpia la cookie y responde `401`.
- **Middleware `verificarRol(...roles)`**: siempre se aplica después de `verificarToken`; responde `403` si el rol del usuario no está en la lista permitida.
- **Bootstrap de admin** (`config/seed.js`): al arrancar, si no existe ningún usuario con rol `admin`, se crea uno automáticamente usando `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NOMBRE` del `.env`. Si esas variables faltan, simplemente se omite (con advertencia en logs), sin bloquear el arranque.

Roles del sistema: `admin`, `operador`, `visualizador`, `icuap`.

| Recurso              | visualizador | operador | icuap | admin |
| -------------------- | :----------: | :------: | :---: | :---: |
| Telemetría (lectura) |      ✔       |    ✔     |   ✔   |   ✔   |
| Alertas (lectura)    |      ✔       |    ✔     |   ✔   |   ✔   |
| Alertas (resolver)   |      ✘       |    ✔     |   ✔   |   ✔   |
| Muestras (registrar) |      ✘       |    ✘     |   ✔   |   ✔   |
| Reportes (generar)   |      ✘       |    ✘     |   ✔   |   ✔   |
| Nodos (gestionar)    |      ✘       |    ✘     |   ✘   |   ✔   |
| Umbrales (modificar) |      ✘       |    ✘     |   ✘   |   ✔   |

## API REST

Base: `/api/v1`

| Módulo         | Endpoints principales                                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**       | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/role/:userId` (admin)                                                                                                                                                 |
| **Nodos**      | `GET /nodos`, `GET /nodos/:id`, `POST /nodos` (admin — paso 1: crea el nodo y precarga umbrales NOM-127 por defecto), `POST /nodos/:id/credenciales-mqtt` (admin — paso 2: genera/rota credenciales MQTT), `PUT /nodos/:id` (admin), `DELETE /nodos/:id` (admin) |
| **Telemetría** | `GET /telemetria/live` (última lectura por nodo activo), `GET /telemetria/:nodo_id` (historial, `limit` hasta 500), `GET /telemetria/:nodo_id/rango` (por rango de fechas)                                                                                       |
| **Muestras**   | `GET /muestras`, `GET /muestras/:id`, `POST /muestras` (icuap/admin — máx. 5/día por nodo), `PUT /muestras/:id/nota`, `GET /muestras/test/forzar` (solo admin, marcado para eliminar antes de producción)                                                        |
| **Alertas**    | `GET /alertas` (filtros: `resuelta`, `nodo_id`, `parametro`), `GET /alertas/:id`, `PUT /alertas/:id/resolver` (operador/icuap/admin)                                                                                                                             |
| **Umbrales**   | `GET /umbrales` (agrupados por nodo), `GET /umbrales/:nodo_id`, `PUT /umbrales/:nodo_id` (admin)                                                                                                                                                                 |
| **Reportes**   | `GET /reportes` (icuap/admin), `POST /reportes/generar` (icuap/admin — devuelve PDF y registra metadatos), `GET /reportes/:id`, `GET /reportes/:id/pdf` (regenera el PDF a partir de los datos almacenados)                                                      |

Todos los endpoints (excepto `register`/`login`) requieren la cookie `kanan_token` y aplican el middleware de rol correspondiente. Además, toda la API bajo `/api/v1` pasa por un rate limit general (300 peticiones / 15 min por IP), y `/auth/login` y `/auth/register` tienen un límite más estricto (10 intentos / 15 min por IP).

## Gestión de credenciales MQTT y reload de Mosquitto

El registro de un nodo ocurre en **dos pasos independientes** (`services/mqttCredentials.js`, disparado desde `routes/nodos.js`):

1. `POST /nodos` — crea el registro del nodo en PostgreSQL y precarga sus umbrales NOM-127 por defecto. Si la generación de credenciales MQTT falla en este mismo paso, el nodo igual queda creado (no se hace rollback), y la respuesta indica `credenciales_error` con instrucciones para reintentar.
2. `POST /nodos/:id/credenciales-mqtt` — (re)genera las credenciales MQTT: username = MAC normalizada (sin `:` ni `-`, mayúsculas), password aleatoria de 20 caracteres. El flujo interno:
   - Escribe el hash en el `passwd` real de Mosquitto vía el binario `mosquitto_passwd -b` (idempotente).
   - Agrega la regla `topic readwrite nodo/<mac>/telemetria` al `acl_file` (evita duplicar si el usuario ya tiene una entrada).
   - Le manda `SIGHUP` al contenedor `kanan_mosquitto` a través de `docker-proxy` (ver [Aislamiento del socket de Docker](#aislamiento-del-socket-de-docker)) para que recargue `passwd`/ACL **sin tumbar las conexiones activas** de los nodos ya conectados.
   - Guarda solo el `username` en `mqtt_credenciales` (nunca la contraseña — esa solo vive en el `passwd` file de Mosquitto).
   - La contraseña en texto plano se devuelve **una sola vez** en la respuesta HTTP; no se puede recuperar después.

Separar el registro del nodo de la generación de credenciales permite reintentar la parte de Mosquitto sin tener que borrar y recrear el nodo si algo falla (ej. el `docker-proxy` no está disponible todavía).

## Scheduler de muestras oficiales

`muestraScheduler.js` usa `node-cron` en zona horaria `America/Mexico_City` para tomar **5 muestras oficiales diarias** por nodo activo, en los horarios: `07:00`, `10:00`, `13:00`, `16:00`, `19:00`.

En cada ejecución:

1. Obtiene los nodos activos de PostgreSQL.
2. Busca la lectura más reciente de cada nodo en MongoDB (`telemetria`) dentro de los últimos 5 minutos.
3. Si no hay lectura reciente, el nodo se considera posiblemente desconectado y se omite.
4. Si hay lectura, la guarda como `Muestra` oficial (persistencia indefinida, sin TTL) y emite `muestra:nueva` por WebSocket.

> Existe un endpoint de solo pruebas (`GET /muestras/test/forzar`, solo admin) para ejecutar la toma manualmente — está marcado en el código para eliminarse antes de producción.

## Generación de reportes PDF

`reporteGenerator.js` construye, con PDFKit, un reporte de cumplimiento NOM-127-SSA1-2021 para un nodo y rango de fechas:

- Header institucional, badge de cumplimiento (✓/✗) calculado a partir de si **todos** los parámetros con muestras cumplen sus límites.
- Los límites NOM-127 usados se leen **directamente de la tabla `umbrales` por nodo** — la misma fuente que usa `telemetria.worker.js` para las alertas en tiempo real, así el PDF nunca puede divergir de lo que ya se le alertó al usuario. Si un nodo no tiene umbral configurado para algún parámetro, el reporte lo marca explícitamente como "Sin umbral configurado" en vez de asumir un valor por defecto.
- Tabla de estadísticas por parámetro (promedio, mínimo, máximo, límites NOM-127, cumple/no cumple).
- Detalle de cada muestra oficial del periodo.
- Tabla de alertas registradas en el periodo (con estado de resolución).
- El PDF se genera en memoria y se entrega como descarga directa (`application/pdf`); los metadatos (`nodo_id`, periodo, usuario, `cumple_nom`) se guardan en `reportes_nom127` para que el reporte sea **reproducible** ante auditorías (`GET /reportes/:id/pdf` lo regenera desde cero).

## WebSockets (tiempo real)

Socket.io se monta sobre el mismo servidor HTTP (un solo proceso, sin necesidad de puerto adicional). El singleton `services/socket.js` evita dependencias circulares al exponer `getIO()`/`setIO()` a cualquier módulo. El CORS de Socket.io usa la **misma whitelist de orígenes** (`CORS_ORIGINS`) que el middleware `cors` de Express — evita que el WebSocket quede abierto a cualquier origen mientras el REST ya está restringido.

Eventos emitidos:

| Evento            | Origen                                        | Payload                                |
| ----------------- | --------------------------------------------- | -------------------------------------- |
| `telemetria:live` | Worker, tras persistir una lectura válida     | `{ nodo_id, mac, timestamp, valores }` |
| `alertas:nueva`   | Worker, tras registrar una alerta             | `{ nodo_id, mac, alerta }`             |
| `muestra:nueva`   | Scheduler, tras registrar una muestra oficial | `{ nodo_id, mac, ubicacion, muestra }` |

## Migraciones de base de datos

`config/migrations.js` implementa un runner de migraciones **versionado real**, no solo `CREATE TABLE IF NOT EXISTS` sueltos:

- Tabla de control `schema_migrations` registra qué migración se aplicó y cuándo.
- Los archivos en `migrations/` se ordenan por su prefijo numérico (`001_...`, `002_...`, etc.) y se aplican solo los pendientes.
- Cada migración corre en su **propia transacción**; si una falla, se hace `ROLLBACK` de esa migración y se detiene el proceso — las anteriores ya aplicadas quedan como están.
- Soporta rollback manual de la(s) última(s) `n` migraciones vía `require('./config/migrations').rollback(n)`.

## Documentación Swagger

Disponible en `GET /api-docs` (Swagger UI) y como JSON crudo en `GET /swagger-json` (usado también para auditorías con OWASP ZAP). Definido en `config/swagger.js` a partir de las anotaciones JSDoc de cada archivo de rutas.

## Seguridad — estado actual

Lo ya implementado:

- `helmet` + `express-rate-limit` (general y específico para login/registro) en el REST.
- CORS de Express y Socket.io comparten la misma whitelist de orígenes.
- Registro de nodo en dos pasos, independiente de la generación de credenciales MQTT.
- Migraciones versionadas con tabla de control (`schema_migrations`).
- Umbrales NOM-127 como fuente única de verdad (tabla `umbrales`), consultada tanto por el worker como por el generador de reportes — ya no hay divergencia entre alertas en tiempo real y el badge del PDF.
- Backend aislado del socket de Docker: habla con `docker-proxy` (allowlist mínima) en vez de montar `/var/run/docker.sock` directamente.

Pendiente:

- ⏳ Certificados TLS reales (Let's Encrypt) — actualmente autofirmados en desarrollo.
- ⏳ Rate limiter de telemetría persistente — el de `telemetria.worker.js` vive en memoria (`Map`) y se reinicia si el worker se reinicia; no sobrevive a un restart ni escala a múltiples instancias del worker.
- ⏳ Auditoría completa con OWASP ZAP antes de despliegue a producción.
- ⏳ Rotación de credenciales documentada formalmente como parte del handover institucional.

## Trabajo futuro

- Detección de tendencias predictivas (IA) sobre el histórico de telemetría.
- Calibración del sensor de turbidez a unidades NTU (actualmente se reporta como % del rango del ADC).
- Pipeline de detección de outliers basado en delta entre lecturas consecutivas del mismo nodo.
- Gestión de batería (BMS) y mejora de autonomía energética del nodo.
- Rediseño de la boya con materiales propios (actualmente tubería comercial).
- Integración del Mosquitto Dynamic Security Plugin para autenticación MQTT totalmente dinámica (requiere compilar el plugin — fase futura más compleja que el flujo actual de `passwd`/ACL + `SIGHUP`).
