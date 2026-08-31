# Kanan — Guía de integración Frontend

Referencia de todo lo que el backend expone y cómo consumirlo desde React/Angular. Cubre REST, WebSockets, autenticación y las particularidades que hay que respetar para no pelear con CORS/cookies.

---

## Tabla de contenido

- [Configuración base](#configuración-base)
- [Autenticación](#autenticación)
- [Roles y permisos](#roles-y-permisos)
- [Endpoints REST](#endpoints-rest)
  - [Auth](#auth)
  - [Nodos](#nodos)
  - [Telemetría](#telemetría)
  - [Muestras](#muestras)
  - [Alertas](#alertas)
  - [Umbrales](#umbrales)
  - [Reportes](#reportes)
- [WebSockets (tiempo real)](#websockets-tiempo-real)
- [Manejo de errores — cosas raras a saber](#manejo-de-errores--cosas-raras-a-saber)
- [Ejemplo de cliente API mínimo](#ejemplo-de-cliente-api-mínimo)

---

## Configuración base

```
Base URL REST:     http://localhost:3000/api/v1
Base URL Socket.io: http://localhost:3000
Swagger UI:        http://localhost:3000/api-docs
```

**CORS:** el backend solo acepta peticiones desde una whitelist fija en `index.js`:

```js
const CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3001"];
```

Si tu frontend corre en otro puerto (por ejemplo Angular en `4200`), pide que se agregue a esa lista en el backend — de lo contrario el navegador bloquea la respuesta por CORS aunque el request "llegue" al servidor.

**Cookies, siempre:** la sesión vive en una cookie `httpOnly` llamada `kanan_token`. Esto tiene dos implicaciones que **debes** aplicar en cada request:

- `fetch`: agregar `credentials: 'include'`
- `axios`: agregar `withCredentials: true` (o configurarlo global en la instancia)
- Socket.io client: `io(url, { withCredentials: true })`

Sin esto, el login "funciona" pero ninguna petición subsecuente te va a reconocer como autenticado.

---

## Autenticación

Flujo típico de una SPA:

1. Al montar la app: `GET /auth/me` para saber si ya hay sesión activa (cookie válida). Si responde `401`, mostrar login.
2. `POST /auth/login` con `{ email, password }`. Si es exitoso, el backend pone la cookie automáticamente — **no hay token que guardar en localStorage ni nada que mandar en headers**.
3. Todas las peticiones siguientes solo necesitan `credentials: 'include'`; el navegador manda la cookie solo.
4. `POST /auth/logout` para cerrar sesión (limpia la cookie del lado del servidor).

La sesión expira a las 8 horas (`JWT_SECRET`, `expiresIn: '8h'`). Si expira, cualquier endpoint protegido responde `401` y hay que redirigir a login.

---

## Roles y permisos

Roles existentes: `admin`, `operador`, `visualizador`, `icuap`.

| Recurso              | visualizador | operador | icuap | admin |
| --------------------- | :----------: | :------: | :---: | :---: |
| Telemetría (lectura)  |      ✔       |    ✔     |   ✔   |   ✔   |
| Alertas (lectura)     |      ✔       |    ✔     |   ✔   |   ✔   |
| Alertas (resolver)    |      ✘       |    ✔     |   ✔   |   ✔   |
| Muestras (registrar)  |      ✘       |    ✘     |   ✔   |   ✔   |
| Reportes (generar)    |      ✘       |    ✘     |   ✔   |   ✔   |
| Nodos (gestionar)     |      ✘       |    ✘     |   ✘   |   ✔   |
| Umbrales (modificar)  |      ✘       |    ✘     |   ✘   |   ✔   |

**Para la UI:** usa el `rol` que devuelve `GET /auth/me` para ocultar/deshabilitar botones y rutas que el usuario no puede usar. El backend igual valida todo por su cuenta (`403` si no tiene permiso), pero ocultarlo en la UI evita clics frustrantes.

Nuevo usuario registrado vía `POST /auth/register` siempre entra como `visualizador` — subir de rol requiere que un `admin` use `PUT /auth/role/:userId`.

---

## Endpoints REST

### Auth

#### `POST /auth/register`
Sin autenticación.

```json
// Request
{ "nombre": "Ana Pérez", "email": "ana@buap.mx", "password": "minimo6chars" }
```

```json
// 201 — éxito
{ "mensaje": "Usuario creado correctamente", "usuario": { "id": "...", "nombre": "...", "email": "...", "rol": "visualizador", "creado_en": "..." } }
```

⚠️ Si el email ya existe o el body es inválido, responde **HTTP 200** (no 400/409) con `{ "success": false, "mensaje": "..." }`. Ver [particularidades](#manejo-de-errores--cosas-raras-a-saber).

#### `POST /auth/login`
Sin autenticación. Pone la cookie `kanan_token` si es exitoso.

```json
// Request
{ "email": "ana@buap.mx", "password": "..." }
```

```json
// 200 — éxito
{ "mensaje": "Login exitoso", "usuario": { "id": "...", "nombre": "...", "email": "...", "rol": "operador" } }
```

⚠️ Credenciales incorrectas también responde **HTTP 200** con `{ "success": false, "mensaje": "Credenciales incorrectas" }`. **Siempre revisa el campo `success` / la presencia de `usuario` en la respuesta de login, nunca solo el status code.**

#### `POST /auth/logout`
Requiere sesión. Limpia la cookie.

```json
// 200
{ "mensaje": "Sesión cerrada correctamente" }
```

#### `GET /auth/me`
Requiere sesión. Úsalo al montar la app para hidratar el estado de usuario.

```json
// 200
{ "id": "...", "nombre": "...", "email": "...", "rol": "admin" }
```
`401` si no hay sesión válida.

#### `PUT /auth/role/:userId`
Solo `admin`.

```json
// Request
{ "rol": "operador" }
```

```json
// 200
{ "mensaje": "Rol actualizado correctamente", "usuario": { "id": "...", "nombre": "...", "email": "...", "rol": "operador" } }
```
`403` si un admin intenta quitarse su propio rol de admin. `404` si el usuario no existe.

---

### Nodos

#### `GET /nodos`
Requiere sesión (cualquier rol).

```json
// 200
[
  { "id": "...", "mac": "AABBCCDDEE90", "ubicacion": "Bebedero norte — Rectoría", "version_fw": "1.0.0", "activo": true, "fecha_alta": "..." }
]
```

#### `GET /nodos/:id`
Requiere sesión. Incluye los umbrales del nodo en la misma respuesta.

```json
// 200
{
  "id": "...", "mac": "...", "ubicacion": "...", "version_fw": "...", "activo": true, "fecha_alta": "...",
  "umbrales": [ { "parametro": "ph", "valor_min": "6.5000", "valor_max": "8.5000" }, ... ]
}
```
`404` si no existe.

#### `POST /nodos`
Solo `admin`. Crea el nodo, precarga sus umbrales NOM-127 por defecto, e **intenta** generar credenciales MQTT en el mismo paso.

```json
// Request
{ "mac": "A4:CF:12:45:6B:2F", "ubicacion": "Bebedero norte — Rectoría", "version_fw": "1.0.0" }
```

```json
// 201
{
  "mensaje": "Nodo registrado correctamente",
  "nodo": { "id": "...", "mac": "A4CF12456B2F", "ubicacion": "...", "version_fw": "...", "activo": true, "fecha_alta": "..." },
  "mqtt": { "username": "A4CF12456B2F", "password": "solo-se-muestra-una-vez", "mensaje": "...", "mosquitto_recargado": true },
  "credenciales_error": null
}
```

Nota: `mac` acepta con o sin separadores (`:` o `-`); el backend la normaliza (mayúsculas, sin separadores) antes de guardarla — la respuesta ya viene normalizada.

Si `mqtt` viene `null` y `credenciales_error` tiene texto, el nodo **sí quedó creado** pero hay que llamar al siguiente endpoint para reintentar.

`409` si la MAC ya está registrada.

#### `POST /nodos/:id/credenciales-mqtt`
Solo `admin`. Genera o **rota** las credenciales MQTT de un nodo existente (sobrescribe la contraseña anterior).

```json
// 200
{
  "mensaje": "Credenciales MQTT generadas correctamente",
  "mqtt": { "username": "...", "password": "...", "mensaje": "Guarda esta contraseña ahora — no volverá a mostrarse.", "mosquitto_recargado": true }
}
```

⚠️ La contraseña solo se devuelve en esta respuesta. Si el usuario cierra el modal sin copiarla, hay que volver a llamar este endpoint (lo cual genera una **nueva** contraseña, invalidando la anterior — hay que avisarle esto al usuario en la UI).

#### `PUT /nodos/:id`
Solo `admin`. Body con cualquier subconjunto de campos.

```json
// Request (cualquier combinación)
{ "ubicacion": "Nueva ubicación", "version_fw": "1.1.0", "activo": false }
```

```json
// 200
{ "mensaje": "Nodo actualizado", "nodo": { "id": "...", "mac": "...", "ubicacion": "...", "version_fw": "...", "activo": false } }
```

#### `DELETE /nodos/:id`
Solo `admin`. Elimina también sus alertas y reportes asociados (por integridad referencial); los umbrales se eliminan solos por `ON DELETE CASCADE`.

```json
// 200
{ "mensaje": "Nodo eliminado correctamente", "nodo": { "id": "...", "mac": "..." } }
```

---

### Telemetría

#### `GET /telemetria/live`
Requiere sesión. Última lectura de **cada nodo activo** — ideal para la vista principal del dashboard al cargar.

```json
// 200
[
  {
    "nodo_id": "...", "mac": "...", "ubicacion": "...",
    "ultima_lectura": { "timestamp": "...", "valores": { "ph": 7.2, "temperatura": 15.3, "conductividad": 450.5, "turbidez": 1.2, "tds": 320 } }
  }
]
```
`ultima_lectura` es `null` si el nodo no ha reportado nada (útil para mostrar "sin datos").

Complementa esto con el evento WebSocket `telemetria:live` para no tener que hacer polling.

#### `GET /telemetria/:nodo_id?limit=50`
Requiere sesión. Historial más reciente primero. `limit` máximo 500 (default 50).

```json
// 200
{ "nodo": { "id": "...", "mac": "...", "ubicacion": "..." }, "total": 50, "lecturas": [ { "_id": "...", "timestamp": "...", "valores": {...} } ] }
```
`404` si el nodo no existe.

#### `GET /telemetria/:nodo_id/rango?desde=ISO&hasta=ISO`
Requiere sesión. Ambos parámetros son obligatorios, formato ISO 8601.

```
GET /telemetria/abc-123/rango?desde=2026-08-01T00:00:00Z&hasta=2026-08-25T23:59:59Z
```

```json
// 200
{ "nodo_id": "...", "desde": "...", "hasta": "...", "total": 120, "lecturas": [...] }
```
`400` si falta algún parámetro, si las fechas no son válidas, o si `desde >= hasta`.

---

### Muestras

Registro **oficial** (sin TTL), distinto de la telemetría en vivo.

#### `GET /muestras?nodo_id=...&limit=50`
Requiere sesión. Ambos params opcionales.

```json
// 200
{ "total": 10, "muestras": [ { "_id": "...", "nodo_id": "...", "mac": "...", "timestamp": "...", "valores": {...}, "nota": "...", "registrado_por": "..." } ] }
```

#### `GET /muestras/:id`
Requiere sesión.

```json
// 200
{ "_id": "...", "nodo_id": "...", "mac": "...", "timestamp": "...", "valores": {...}, "nota": "...", "registrado_por": "..." }
```
`404` si no existe.

#### `POST /muestras`
Solo `icuap` o `admin`. Máximo 5 muestras manuales por nodo por día (comparte el contador con las automáticas del scheduler).

```json
// Request
{
  "nodo_id": "...",
  "valores": { "ph": 7.1, "temperatura": 18.2, "conductividad": 400, "turbidez": 0.8, "tds": 250 },
  "nota": "Muestra tomada manualmente durante visita de campo"
}
```

```json
// 201
{ "mensaje": "Muestra 3 de 5 registrada correctamente", "muestra": { "_id": "...", ... } }
```
`409` si ya se alcanzó el límite diario. `404` si el nodo no existe o está inactivo.

#### `PUT /muestras/:id/nota`
Solo `icuap` o `admin`.

```json
// Request
{ "nota": "Corrección: sensor recalibrado antes de esta muestra" }
```

```json
// 200
{ "mensaje": "Nota actualizada", "muestra": { ... } }
```

#### `GET /muestras/test/forzar`
Solo `admin`. **Solo para pruebas** — ejecuta manualmente la toma de muestras del scheduler. Está marcado para eliminarse antes de producción; no construyas UI permanente sobre esto.

---

### Alertas

#### `GET /alertas?resuelta=true&nodo_id=...&parametro=ph`
Requiere sesión. Todos los filtros son opcionales y combinables.

```json
// 200
{
  "total": 5,
  "alertas": [
    { "id": "...", "nodo_id": "...", "parametro": "ph", "valor_leido": "9.20", "valor_min": "6.5000", "valor_max": "8.5000", "resuelta": false, "creado_en": "...", "mac": "...", "ubicacion": "..." }
  ]
}
```

#### `GET /alertas/:id`
Requiere sesión.

```json
// 200
{ "id": "...", "nodo_id": "...", "parametro": "...", "valor_leido": "...", "valor_min": "...", "valor_max": "...", "resuelta": false, "creado_en": "...", "mac": "...", "ubicacion": "..." }
```
`404` si no existe.

#### `PUT /alertas/:id/resolver`
Roles: `operador`, `icuap`, `admin`. No requiere body.

```json
// 200
{ "mensaje": "Alerta marcada como resuelta", "alerta": { "id": "...", "parametro": "...", "valor_leido": "...", "resuelta": true, "creado_en": "..." } }
```
`404` si no existe **o si ya estaba resuelta** (mismo mensaje para ambos casos — no distingas en la UI, solo refresca la lista).

---

### Umbrales

Límites NOM-127 configurados por nodo. Úsalos para dibujar líneas de referencia en las gráficas.

#### `GET /umbrales`
Requiere sesión. Agrupados por nodo.

```json
// 200
[
  {
    "nodo_id": "...", "mac": "...", "ubicacion": "...",
    "umbrales": {
      "ph": { "id": "...", "valor_min": 6.5, "valor_max": 8.5 },
      "temperatura": { "id": "...", "valor_min": 0, "valor_max": 50 }
    }
  }
]
```

#### `GET /umbrales/:nodo_id`
Requiere sesión.

```json
// 200
{ "nodo_id": "...", "mac": "...", "ubicacion": "...", "umbrales": { "ph": { "id": "...", "valor_min": 6.5, "valor_max": 8.5 }, ... } }
```

#### `PUT /umbrales/:nodo_id`
Solo `admin`. Body con cualquier subconjunto de parámetros; solo actualiza los que envíes.

```json
// Request
{ "turbidez": { "valor_min": 0, "valor_max": 4 }, "ph": { "valor_min": 6.5, "valor_max": 8.5 } }
```

```json
// 200
{ "mensaje": "2 umbral(es) actualizado(s)", "actualizados": [ { "parametro": "turbidez", "valor_min": "0.0000", "valor_max": "4.0000" }, ... ] }
```
`400` si el body está vacío o algún parámetro no es válido. Parámetros válidos: `ph`, `temperatura`, `conductividad`, `turbidez`, `tds`.

---

### Reportes

#### `GET /reportes`
Roles: `icuap`, `admin`.

```json
// 200
{ "total": 3, "reportes": [ { "id": "...", "fecha": "...", "cumple_nom": true, "creado_en": "...", "mac": "...", "ubicacion": "...", "generado_por": "Nombre del usuario" } ] }
```

#### `POST /reportes/generar`
Roles: `icuap`, `admin`. **⚠️ Esta respuesta NO es JSON — es un PDF binario.** Necesitas manejarlo como `blob` en el frontend.

```json
// Request
{ "nodo_id": "...", "fecha_inicio": "2026-08-01", "fecha_fin": "2026-08-25" }
```

Respuesta: `Content-Type: application/pdf`, con headers extra:
- `X-Reporte-Id`: id del reporte recién creado en Postgres
- `X-Cumple-NOM`: `"true"` o `"false"` (string, no boolean)

Ejemplo con `fetch`:

```js
const res = await fetch(`${BASE_URL}/reportes/generar`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodo_id, fecha_inicio, fecha_fin })
});

if (!res.ok) {
  const err = await res.json(); // los errores SÍ son JSON
  throw new Error(err.mensaje);
}

const cumpleNom = res.headers.get('X-Cumple-NOM') === 'true';
const blob = await res.blob();
const url = URL.createObjectURL(blob);
// window.open(url) o <a download href={url}>
```

`400` si `fecha_inicio >= fecha_fin`.

#### `GET /reportes/:id`
Roles: `icuap`, `admin`. Solo metadatos (JSON, no el PDF).

```json
// 200
{ "id": "...", "fecha": "...", "cumple_nom": true, "creado_en": "...", "mac": "...", "ubicacion": "...", "generado_por": "..." }
```

#### `GET /reportes/:id/pdf`
Roles: `icuap`, `admin`. Regenera el PDF **desde cero** a partir de los datos almacenados (mismo manejo de blob que arriba, sin los headers `X-Reporte-Id`/`X-Cumple-NOM`).

---

## WebSockets (tiempo real)

Conexión Socket.io sobre el mismo servidor HTTP (no hay puerto aparte). No hay namespace custom, es el default `/`.

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  withCredentials: true, // necesario para que la cookie de sesión viaje
});
```

| Evento             | Cuándo se emite                               | Payload                                                     |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| `telemetria:live`  | El worker persiste una lectura válida nueva    | `{ nodo_id, mac, timestamp, valores: {ph, temperatura, conductividad, turbidez, tds} }` |
| `alertas:nueva`    | Se registra una alerta nueva (no anti-flooded) | `{ nodo_id, mac, alerta: {id, parametro, valor_leido, valor_min, valor_max, creado_en} }` |
| `muestra:nueva`    | El scheduler registra una muestra oficial      | `{ nodo_id, mac, ubicacion, muestra: {...} }`                |

Patrón recomendado: usa `GET /telemetria/live` para el estado inicial al montar el componente, y luego actualiza en memoria con el evento `telemetria:live` — no vuelvas a pedir el endpoint completo en cada evento.

```js
socket.on("telemetria:live", (data) => {
  // data.nodo_id para saber a qué tarjeta/fila actualizar
});

socket.on("alertas:nueva", (data) => {
  // mostrar toast/notificación + refrescar contador de alertas no resueltas
});
```

---

## Manejo de errores — cosas raras a saber

Estas son inconsistencias reales del backend actual, no un capricho de diseño — hay que programarlas defensivamente en el cliente API:

1. **`POST /auth/register` y `POST /auth/login` devuelven HTTP 200 incluso en fallos de validación o credenciales incorrectas.** El indicador real de éxito/fallo es el campo `success` (o la ausencia del campo `usuario`) en el body, **no el status code**. Todos los demás endpoints sí usan status codes convencionales (`400`, `401`, `403`, `404`, `409`, `500`).
2. **Los errores de validación (Joi) devuelven `{ mensaje: "..." }`** con un solo mensaje de texto (el primer error), no un array de errores por campo.
3. **Los valores numéricos de PostgreSQL (`NUMERIC`) llegan como string** en el JSON (ej. `"6.5000"`, no `6.5`) en algunos endpoints (`alertas`, parte de `umbrales` sin castear) — revisa caso por caso si necesitas `parseFloat()` antes de graficar. Los endpoints de `umbrales` que arma el backend a mano (`GET /umbrales`, `GET /umbrales/:nodo_id`) sí devuelven `valor_min`/`valor_max` ya como `number`.
4. **`POST /reportes/generar` y `GET /reportes/:id/pdf` no devuelven JSON en el caso exitoso** — son streams de PDF. Solo los errores de esos dos endpoints son JSON.
5. **Todos los endpoints protegidos devuelven `401` con `{ mensaje: "Sesión no iniciada" }` o `{ mensaje: "Sesión expirada, inicia sesión nuevamente" }`** — trátalos igual en el cliente (redirigir a login), no dependas del texto exacto.

---

## Ejemplo de cliente API mínimo

```js
const BASE_URL = "http://localhost:3000/api/v1";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  // 401 en cualquier endpoint = sesión inválida/expirada
  if (res.status === 401) {
    // redirigir a login / limpiar estado de usuario
    throw new Error("Sesión expirada");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.mensaje || `Error ${res.status}`);
  }

  return data;
}

// Uso
const nodos = await apiRequest("/nodos");

// Login necesita chequeo manual de `success` porque el backend responde 200 siempre
async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.mensaje);
  return data.usuario;
}
```
