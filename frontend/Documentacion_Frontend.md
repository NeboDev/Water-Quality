# Documentación Técnica del Frontend — Sistema Kanan

> **Proyecto:** Kanan — Sistema de Monitoreo de Calidad del Agua  
> **Estándar de referencia:** NOM-127-SSA1-2021  
> **Versión del frontend:** 2.0.0  
> **Última actualización:** Mayo 2025  

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Configuración y Variables de Entorno](#4-configuración-y-variables-de-entorno)
5. [Punto de Entrada y Bootstrapping](#5-punto-de-entrada-y-bootstrapping)
6. [Capa de API HTTP](#6-capa-de-api-http)
7. [Comunicaciones en Tiempo Real (WebSockets)](#7-comunicaciones-en-tiempo-real-websockets)
8. [Gestión de Estado Global](#8-gestión-de-estado-global)
9. [Seguridad](#9-seguridad)
10. [Gestión de Sesión e Inactividad](#10-gestión-de-sesión-e-inactividad)
11. [Control de Acceso por Roles (RBAC)](#11-control-de-acceso-por-roles-rbac)
12. [Tolerancia a Fallos y Manejo de Errores](#12-tolerancia-a-fallos-y-manejo-de-errores)
13. [Páginas (Views)](#13-páginas-views)
14. [Componentes](#14-componentes)
15. [Hooks Personalizados](#15-hooks-personalizados)
16. [Constantes y Modelos de Datos](#16-constantes-y-modelos-de-datos)
17. [Diseño y Sistema Visual](#17-diseño-y-sistema-visual)
18. [Animaciones y Rendimiento de Gráficas](#18-animaciones-y-rendimiento-de-gráficas)
19. [Configuración de Empaquetado (Vite)](#19-configuración-de-empaquetado-vite)
20. [Consideraciones de Despliegue](#20-consideraciones-de-despliegue)
21. [Deuda Técnica y Aspectos Pendientes](#21-deuda-técnica-y-aspectos-pendientes)

---

## 1. Visión General

Kanan es una **Single Page Application (SPA)** construida con React 18, cuyo propósito es proveer una interfaz de monitoreo en tiempo real de la calidad del agua según los parámetros establecidos en la norma oficial mexicana NOM-127-SSA1-2021.

El frontend opera en dos modos de comunicación con el backend de forma simultánea:

1. **REST API (HTTP):** Para operaciones de lectura/escritura de datos históricos, administración de nodos, usuarios, alertas y generación de reportes.
2. **WebSockets (Socket.IO):** Para la recepción de datos de telemetría en tiempo real y notificaciones de alertas, sin necesidad de recargar la página ni hacer polling.

La aplicación **no contiene lógica de negocio propia** para la validación de normas; esta reside en el backend. El frontend solo representa el estado devuelto por el servidor y aplica las constantes de la NOM-127 (`NOM_127_LIMITS`) únicamente para colorear indicadores y calcular diferencias visuales.

---

## 2. Stack Tecnológico

| Categoría | Tecnología | Versión | Propósito |
|---|---|---|---|
| Framework UI | React | 18.3.1 | Renderizado reactivo de componentes |
| Build Tool | Vite | 6.0.6 | Compilación, HMR y servidor de desarrollo |
| Estilos | Tailwind CSS | 3.4.17 | Utilidades CSS de diseño |
| Post-procesado CSS | PostCSS + Autoprefixer | — | Compatibilidad cross-browser |
| Gráficas | Recharts | 2.13.3 | Visualización de series de tiempo |
| Mapas | Leaflet + react-leaflet | 1.9.4 / 4.2.1 | Mapas interactivos georreferenciados |
| HTTP Client | Axios | 1.16.0 | Llamadas REST al backend |
| WebSockets | Socket.IO Client | 4.8.3 | Telemetría en tiempo real |
| Partículas | @tsparticles/react + slim | 4.0.2 | Fondo animado de burbujas en Login |
| Fuentes | DM Sans + JetBrains Mono | — | Via Google Fonts |

---

## 3. Estructura de Directorios

```
frontend/
├── .env                          # Variables de entorno para desarrollo local
├── index.html                    # HTML raíz; punto de montaje del árbol React
├── vite.config.js                # Config de Vite: plugins, puerto (5173), proxy
├── tailwind.config.js            # Config Tailwind: colores BUAP, sombras, animaciones
├── postcss.config.js             # Config PostCSS con autoprefixer
├── package.json                  # Dependencias y scripts npm
└── src/
    ├── main.jsx                  # Punto de entrada: ReactDOM.createRoot + StrictMode
    ├── App.jsx                   # Orquestador principal: estado global, auth, routing
    ├── api.js                    # Capa de abstracción HTTP (Axios + interceptores)
    ├── constants.js              # Límites NOM-127, colores, parámetros, helpers
    ├── index.css                 # Estilos globales, directivas Tailwind, scrollbar
    ├── hooks/
    │   └── usePermissions.js     # Hook RBAC: booleanos de permisos por rol
    ├── pages/                    # Vistas principales (rutas lógicas)
    │   ├── Login.jsx             # Autenticación con efecto WebGL
    │   ├── Register.jsx          # Auto-registro de cuenta (rol Visualizador)
    │   ├── Overview.jsx          # Panel multi-nodo con gráficas comparativas
    │   ├── SingleView.jsx        # Vista de telemetría de un nodo específico
    │   ├── NodeMap.jsx           # Mapa Leaflet con marcadores de nodos
    │   └── Reportes.jsx          # Generación y descarga de reportes PDF
    └── components/               # Componentes reutilizables
        ├── Header.jsx            # Barra de navegación, selector de nodo, menús
        ├── ParameterCard.jsx     # Tarjeta de parámetro individual (mini-chart + valor)
        ├── ExpandedChart.jsx     # Modal de historial ampliado (AreaChart)
        ├── MultiNodeExpandedChart.jsx # Modal comparativo multi-nodo (LineChart)
        ├── GlobalAlertsDrawer.jsx # Drawer lateral de alertas activas
        ├── NodoForm.jsx          # Formulario de registro de nodo (solo Admin)
        ├── NodoConfig.jsx        # Panel de edición/eliminación de nodos (solo Admin)
        ├── UsuarioForm.jsx       # Formulario de creación de usuario (solo Admin)
        ├── StatusBar.jsx         # Barra de estado rápido del nodo seleccionado
        ├── ErrorBoundary.jsx     # Capturador de errores de renderizado React
        ├── WaterRippleGL.jsx     # Efecto de agua en WebGL (GLSL puro)
        ├── WaterBubblesGL.jsx    # Fondo de burbujas con @tsparticles
        └── common/               # Átomos UI reutilizables
            ├── Alert.jsx         # Banner de alerta (error/success/info)
            ├── Modal.jsx         # Contenedor modal genérico
            ├── InputField.jsx    # Campo de texto con label, ícono y error
            └── SuccessState.jsx  # Estado de éxito post-acción
```

---

## 4. Configuración y Variables de Entorno

El frontend utiliza el sistema de variables de entorno de Vite. Todas las variables deben llevar el prefijo `VITE_` para ser accesibles en el cliente.

**Archivo `.env` (desarrollo local):**
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

| Variable | Uso | Fallback en código |
|---|---|---|
| `VITE_API_URL` | Base URL de la REST API del backend | `http://localhost:3000/api/v1` |
| `VITE_SOCKET_URL` | URL del servidor Socket.IO | `http://localhost:3000` |

> **Importante para producción:** Antes de desplegar, crear un archivo `.env.production` (o configurar las variables en el servidor CI/CD) con las URLs reales del backend. El archivo `.env` local **nunca** debe ser comiteado con credenciales ni URLs de producción. Ya está incluido en `.gitignore`.

**Acceso en código:**
```javascript
// api.js
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// App.jsx
socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000");
```

---

## 5. Punto de Entrada y Bootstrapping

**`src/main.jsx`** es el punto de entrada de la aplicación:

```jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- Utiliza la API de **React 18 Concurrent Mode** (`createRoot`).
- `React.StrictMode` activa advertencias adicionales y doble invocación de efectos en desarrollo para detectar efectos secundarios inadvertidos.
- No existe ningún enrutador de cliente (React Router, TanStack Router, etc.). La navegación entre vistas se gestiona mediante un estado `view` en `App.jsx`.

---

## 6. Capa de API HTTP

Toda la comunicación HTTP está centralizada en **`src/api.js`**, que exporta una instancia de Axios preconfigurada y funciones con nombres semánticos para cada endpoint.

### 6.1 Configuración de la Instancia Axios

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,   // CRÍTICO: envía la cookie HttpOnly en cada request
});
```

El flag `withCredentials: true` es esencial para el funcionamiento de la autenticación basada en cookies. Sin él, el navegador no adjuntaría la cookie de sesión a los requests cross-origin.

### 6.2 Interceptor de Respuesta (Manejo Global de Errores)

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    // 401 = sesión expirada (manejado por timeout en App.jsx)
    if (error.response?.status === 401) { /* sin acción adicional */ }
    // Normaliza el error: extrae mensaje del backend o usa mensaje genérico
    const mensaje = error.response?.data?.mensaje || `Error ${error.response?.status || 'desconocido'}`;
    return Promise.reject(new Error(mensaje));
  }
);
```

El interceptor garantiza que **todos** los errores de API sean instancias de `Error` con un mensaje legible. Los componentes no necesitan parsear respuestas de error — simplemente capturan `err.message`.

> **Nota:** El interceptor actualmente no redirige automáticamente al login en un 401. El control de sesión expirada se maneja mediante el sistema de timeout de inactividad en `App.jsx`. Si el servidor devuelve 401 fuera de ese flujo, el error propagará al componente que hizo la llamada.

### 6.3 Catálogo Completo de Endpoints

#### Autenticación

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `login(email, password)` | `POST` | `/auth/login` | `{ email, password }` | `{ usuario: { id, nombre, email, rol } }` |
| `logout()` | `POST` | `/auth/logout` | — | Invalida la cookie de sesión en el servidor |
| `checkSession()` | `GET` | `/auth/me` | — | `{ usuario }` (verifica y renueva la cookie) |

- **`login`**: Usado en `Login.jsx`. Al éxito, el backend establece la cookie HttpOnly de sesión.
- **`logout`**: Llamado en `App.jsx::handleLogout()`. El backend invalida la sesión en servidor.
- **`checkSession`**: Llamado en `App.jsx::handleExtendSession()` cuando el usuario elige "Continuar" en el modal de advertencia de inactividad. Renueva la sesión en el servidor y reinicia el temporizador local.

#### Gestión de Nodos

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `fetchNodos()` | `GET` | `/nodos` | — | Array de nodos `[{ id, mac, ubicacion, version_fw, activo, fecha_alta }]` |
| `registrarNodo({ mac, ubicacion, version_fw })` | `POST` | `/nodos` | `{ mac, ubicacion, version_fw? }` | `{ nodo }` |
| `editarNodo(id, campos)` | `PUT` | `/nodos/:id` | `{ ubicacion?, version_fw?, activo? }` | `{ nodo }` |
| `eliminarNodo(id)` | `DELETE` | `/nodos/:id` | — | Confirmación |

- **MAC normalization:** `NodoForm.jsx` convierte la MAC a mayúsculas (`.toUpperCase()`) antes de enviar.
- **Campos opcionales en PUT:** `ubicacion`, `version_fw` y `activo` son todos opcionales. Solo se envían los que tienen valor.
- **Soft delete:** El campo `activo` en `editarNodo` desactiva el nodo sin eliminar su historial de telemetría.
- **Después de eliminar:** `NodoConfig.jsx` llama `onNodesChanged(null, id)` para que `App.jsx` elimine el nodo del estado local.

#### Telemetría

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `fetchTelemetria(nodoId, limit=50)` | `GET` | `/telemetria/:nodoId?limit=N` | — | `{ lecturas: [...] }` |
| `fetchTelemetriaRango(nodoId, desde, hasta)` | `GET` | `/telemetria/:nodoId/rango` | Query: `?desde=&hasta=` | `{ lecturas: [...] }` |

- Las lecturas vienen ordenadas **newest → oldest** (más reciente primero). La función `buildHistory()` en `constants.js` las invierte para graficarlas cronológicamente.
- **Límites de carga:**
  - `App.jsx` carga las últimas `50` muestras al inicializar (parámetro por defecto).
  - `ExpandedChart.jsx` solicita las últimas `30` muestras para el historial expandido.
  - `MultiNodeExpandedChart.jsx` usa las últimas `10` muestras del historial ya en memoria (sin llamada de red adicional, derivadas de `useMemo`).
- `fetchTelemetriaRango` está implementado en `api.js` y es invocado desde la UI por `ExpandedChart.jsx` y `MultiNodeExpandedChart.jsx` al activar los filtros de rangos de tiempo y hora.

**Estructura de una lectura de telemetría:**
```json
{
  "id": "uuid",
  "nodo_id": "uuid",
  "timestamp": "2025-05-25T02:00:00Z",
  "valores": {
    "ph": 7.2,
    "turbidez": 1.3,
    "conductividad": 450.0,
    "temperatura": 22.5,
    "tds": 320.0
  }
}
```

#### Alertas

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `fetchAlertas({ resuelta?, nodo_id? })` | `GET` | `/alertas` | Query: `?resuelta=false` | `{ alertas: [...] }` |
| `resolverAlerta(alertaId)` | `PUT` | `/alertas/:id/resolver` | — | Confirmación |

- Al cargar la aplicación, se solicitan solo las alertas **no resueltas** (`resuelta: false`).
- Nuevas alertas llegan en tiempo real vía WebSocket (evento `alertas:nueva`).
- Solo roles `admin`, `icuap` y `operador` pueden llamar `resolverAlerta`.

**Estructura de una alerta:**
```json
{
  "id": "uuid",
  "nodo_id": "uuid",
  "parametro": "ph",
  "valor_leido": 9.2,
  "valor_max": 8.5,
  "valor_min": 6.5,
  "creado_en": "2025-05-25T02:00:00Z",
  "ubicacion": "Planta de tratamiento norte"
}
```

#### Muestras Físicas (Laboratorio)

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `fetchMuestras({ nodo_id?, limit=10 })` | `GET` | `/muestras` | Query params | `{ muestras: [...] }` |
| `registrarMuestra({ nodo_id, valores, nota })` | `POST` | `/muestras` | `{ nodo_id, valores, nota }` | `{ muestra }` |
| `actualizarNota(muestraId, nota)` | `PUT` | `/muestras/:id/nota` | `{ nota }` | `{ muestra }` |

> **Estado actual:** Las funciones están implementadas en `api.js` y están plenamente integradas en la interfaz a través de `MuestraModal.jsx`, el cual se despliega desde las tarjetas `ParameterCard.jsx` en la vista `SingleView` al pasar el cursor sobre la opción "Muestra".

#### Reportes

| Función | Método | Endpoint | Cuerpo | Respuesta |
|---|---|---|---|---|
| `fetchReportes()` | `GET` | `/reportes` | — | `{ reportes: [{ id, fecha, cumple_nom, creado_en, mac, ubicacion, generado_por }] }` |
| `generarReporte({ nodo_id, fecha_inicio, fecha_fin })` | `POST` | `/reportes/generar` | `{ nodo_id, fecha_inicio, fecha_fin }` | **Blob PDF** + headers |
| `descargarPdfReporte(id)` | `GET` | `/reportes/:id/pdf` | — | **Blob PDF** |

- `generarReporte` usa `{ responseType: 'blob' }` para recibir el PDF binario directamente.
- El backend incluye cabeceras personalizadas en la respuesta de `generarReporte`:
  - `x-reporte-id`: UUID del reporte generado.
  - `x-cumple-nom`: `"true"` o `"false"` — indica si el nodo cumple la NOM-127 en el periodo solicitado.
- `Reportes.jsx` descarga el PDF inmediatamente con `URL.createObjectURL(blob)` + elemento `<a>` dinámico, y libera la URL con `URL.revokeObjectURL()`.

---

## 7. Comunicaciones en Tiempo Real (WebSockets)

### 7.1 Inicialización de la Conexión

La conexión Socket.IO se abre en `App.jsx` dentro de un `useEffect` que depende de `auth?.user`:

```javascript
useEffect(() => {
  if (!auth?.user) return;  // solo si hay sesión activa

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000");

  socket.on("telemetria:live", handler);
  socket.on("alertas:nueva", handler);

  return () => {
    if (socket) socket.disconnect();
  };
}, [auth?.user]);
```

- La conexión se establece **solo cuando hay una sesión activa**.
- Al cerrar sesión (`handleLogout`), se llama explícitamente a `socket.disconnect()` antes de limpiar el estado.
- La variable `socket` es **modular** (declarada en el scope del módulo), no en el estado React, para evitar re-renders innecesarios al conectar/desconectar.

### 7.2 Eventos Escuchados

#### `telemetria:live`

Recibe el último paquete de telemetría de un nodo y actualiza el estado en memoria sin re-fetch.

**Payload esperado:**
```json
{
  "nodo_id": "uuid",
  "timestamp": "2025-05-25T02:05:00Z",
  "valores": { "ph": 7.1, "turbidez": 1.5, "conductividad": 460, "temperatura": 23.1, "tds": 325 }
}
```

**Lógica de actualización:**
```javascript
setNodes(prev => prev.map(n => {
  if (n.id !== latest.nodo_id) return n;  // solo el nodo afectado

  const newHistory = {};
  PARAMS.forEach(p => {
    const pt = telemetryToPoint(latest, p);
    const currentHist = n.history?.[p] || [];
    // Ventana deslizante: máximo HISTORY_LIMIT (24) puntos
    newHistory[p] = [...currentHist.slice(-(HISTORY_LIMIT - 1)), pt];
  });
  return { ...n, sinDatos: false, valores: latest.valores, timestamp: latest.timestamp, history: newHistory };
}));
```

- Se actualiza tanto el array `nodes` (para Overview) como `selectedNode` (para SingleView).
- Se usa una **ventana deslizante de 24 muestras** (`HISTORY_LIMIT`). Al recibir una nueva muestra, la más antigua se descarta del extremo izquierdo del array.
- La actualización es **granular**: solo el nodo con `id === latest.nodo_id` se modifica. React reusa los otros nodos sin re-renderizarlos.

**Ref anti-stale-closure:**
```javascript
const nodesRef = useRef([]);
useEffect(() => { nodesRef.current = nodes; }, [nodes]);
```
Este ref permite que los handlers del socket accedan a la versión actualizada de `nodes` sin capturar valores obsoletos en la closure del useEffect.

#### `alertas:nueva`

Recibe una nueva alerta cuando un parámetro excede los límites NOM-127.

**Payload esperado:**
```json
{
  "nodo_id": "uuid",
  "mac": "A4:CF:12:45:6B:2F",
  "alerta": { "id": "uuid", "parametro": "ph", "valor_leido": 9.5, ... }
}
```

**Lógica de actualización:**
```javascript
const nodoLocal = nodesRef.current.find(n => n.id === payload.nodo_id);
const alertaEnriquecida = {
  ...payload.alerta,
  nodo_id: payload.nodo_id,
  // Enriquecimiento: la alerta se decora con la ubicación del nodo
  ubicacion: payload.alerta.ubicacion || nodoLocal?.ubicacion || nodoLocal?.node_id || payload.mac,
};
setGlobalAlerts(prev => [alertaEnriquecida, ...prev]);  // más reciente primero
```

---

## 8. Gestión de Estado Global

`App.jsx` es el único orquestador de estado global. No se usa Redux, Zustand ni ninguna librería externa de gestión de estado. Todo el estado se gestiona con `useState` y `useRef` de React.

### 8.1 Inventario de Estado

| Estado | Tipo | Propósito |
|---|---|---|
| `auth` | `{ user } \| null` | Sesión activa del usuario. Se hidrata desde `sessionStorage` al montar. |
| `screen` | `"login" \| "register"` | Vista a mostrar cuando no hay sesión. |
| `nodes` | `Node[]` | Lista de todos los nodos, actualizada con telemetría en tiempo real. |
| `selectedNode` | `Node \| null` | Nodo actualmente visualizado en SingleView. |
| `view` | `"overview" \| "dashboard" \| "map" \| "reportes"` | Vista activa de la aplicación. |
| `loadingNodes` | `boolean` | Spinner de carga inicial de nodos. |
| `loadingTelemetry` | `boolean` | Spinner de carga al seleccionar un nuevo nodo. |
| `initializingTelemetry` | `boolean` | Spinner de pantalla completa durante la inicialización paralela. |
| `nodesError` | `string` | Mensaje de error si falla la carga de nodos. |
| `expandedParam` | `string \| null` | Parámetro seleccionado para abrir `ExpandedChart`. |
| `expandedOverviewParam` | `string \| null` | Parámetro seleccionado para abrir `MultiNodeExpandedChart`. |
| `showNodoForm` | `boolean` | Controla visibilidad del formulario de registro de nodo. |
| `showUsuarioForm` | `boolean` | Controla visibilidad del formulario de creación de usuario. |
| `showNodoConfig` | `boolean` | Controla visibilidad del panel de configuración de nodos. |
| `globalAlerts` | `Alerta[]` | Alertas activas del sistema. Cargadas al inicio, actualizadas por WebSocket. |
| `showGlobalAlerts` | `boolean` | Controla visibilidad del `GlobalAlertsDrawer`. |
| `showTimeoutWarning` | `boolean` | Muestra el modal de advertencia de inactividad. |
| `timeoutCountdown` | `number` | Segundos restantes en el contador regresivo del modal de inactividad. |

### 8.2 Flujo de Inicialización

```
1. App monta → lee sessionStorage → si hay sesión, setAuth(s)
2. useEffect[auth] → loadNodes() → parallel Promise.all(loadTelemetrySilent)
3. useEffect[auth] → fetchAlertas({ resuelta: false }) → setGlobalAlerts
4. useEffect[auth?.user] → socket.io connect → escucha eventos
5. Usuario navega, selecciona nodo → setSelectedNode → setView("dashboard")
```

### 8.3 Enriquecimiento Dinámico de Nodos

Antes de pasar los nodos a los componentes hijos, `App.jsx` los "enriquece" con un estado dinámico basado en las alertas activas:

```javascript
const enrichedNodes = nodes.map(node => {
  if (node.status === "inactivo") return node;  // nodos inactivos no se re-evalúan
  const hasUnresolvedAlert = globalAlerts?.some(a => a.nodo_id === node.id);
  if (hasUnresolvedAlert) return { ...node, status: "alerta" };
  const isOut = PARAMS.some(p => {
    const l = NOM_127_LIMITS[p];
    return node.valores[p] < l.min || node.valores[p] > l.max;
  });
  if (isOut) return { ...node, status: "alerta" };
  return { ...node, status: "activo" };
});
```

Este cálculo se ejecuta en cada renderizado y garantiza que el status visual sea siempre consistente con el estado actual de las alertas.

---

## 9. Seguridad

### 9.1 Autenticación basada en Cookies HttpOnly

La aplicación **no almacena tokens de sesión en `localStorage` ni en `sessionStorage`**. El backend emite una cookie con los siguientes atributos de seguridad:

- **`HttpOnly`**: JavaScript en el cliente **no puede leer ni modificar** la cookie. Esto elimina el vector de ataque más común de XSS (robo de tokens).
- **`Secure`** (en producción): La cookie solo se transmite sobre HTTPS.
- **`SameSite`** (configurado en backend): Mitiga ataques CSRF.

El frontend solo sabe que existe una sesión porque el backend responde con éxito a las peticiones. Axios envía la cookie automáticamente gracias a `withCredentials: true`.

### 9.2 Uso de sessionStorage (Solo para UX)

Al hacer login, el objeto del usuario (sin datos sensibles) se guarda en `sessionStorage`:

```javascript
const SESSION_KEY = "aquamonitor_session";

// Al hacer login:
sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));

// Al montar App:
const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
```

**Propósito:** Restaurar el nombre y rol del usuario en la interfaz si se recarga la pestaña, **sin necesidad de hacer un nuevo login**. La sesión real (la cookie) ya fue enviada automáticamente por el navegador.

**Datos almacenados:** Solo `{ user: { nombre, email, rol } }`. No se almacenan tokens, IDs de sesión ni información sensible.

**Alcance:** `sessionStorage` es por pestaña — cerrar la pestaña elimina el estado local. La cookie de sesión puede persistir según la configuración del backend.

### 9.3 Logout Seguro

El cierre de sesión siempre pasa por el servidor:

```javascript
const handleLogout = async () => {
  try { await apiLogout(); } catch { /* continuar aunque falle el request */ }
  sessionStorage.removeItem(SESSION_KEY);
  if (socket) { socket.disconnect(); socket = null; }
  setAuth(null);
  setNodes([]);
  // ... limpieza de estado restante
};
```

Se llama `apiLogout()` para que el backend invalide la cookie. El estado local se limpia independientemente del resultado de la llamada al servidor. Si el servidor no está disponible, el usuario igual es "deslogueado" localmente (aunque la cookie del servidor podría persistir hasta su expiración natural).

### 9.4 Protección contra XSS

- No se usa `dangerouslySetInnerHTML` en ningún componente.
- Los mapas de Leaflet generan popups con HTML concatenado (`buildPopupHTML`). Este HTML está construido con datos del servidor (nombres de ubicación, valores numéricos) que deben ser sanitizados en el backend antes de persistirse.
- Los inputs de usuarios no se ejecutan como código.

### 9.5 Modelo de Seguridad: El Frontend No Es Confiable

La interfaz oculta controles según los permisos del rol, pero esto es solo por UX. Toda operación privilegiada debe ser validada en el servidor. Si un usuario manipula el DOM para ver un botón oculto y hace clic, el backend responderá con `401 Unauthorized` o `403 Forbidden`.

---

## 10. Gestión de Sesión e Inactividad

El sistema implementa un mecanismo de detección de inactividad para cerrar la sesión automáticamente después de 30 minutos, en sincronía con el timeout del backend.

### 10.1 Detección de Actividad

Se escuchan los siguientes eventos globales del navegador:

```javascript
const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
events.forEach(ev => window.addEventListener(ev, handleUserActivity));
```

`handleUserActivity` actualiza `lastActivityRef.current = Date.now()`, pero **solo si el modal de advertencia no está visible**. Esto evita que simples movimientos del mouse reinicien el temporizador cuando el sistema ya está a punto de cerrar la sesión.

### 10.2 Temporizadores

Un `setInterval` de 5 segundos evalúa el tiempo de inactividad:

| Tiempo de inactividad | Acción |
|---|---|
| `< 29 minutos` | Sin acción. |
| `≥ 29 minutos` | `setShowTimeoutWarning(true)` — aparece el modal. |
| `≥ 30 minutos` | `handleLogout()` automático. |

### 10.3 Modal de Advertencia

Cuando `showTimeoutWarning === true`, se muestra un modal con:
- Ícono animado de advertencia (pulso amber).
- Texto: *"Tu sesión está a punto de expirar..."*
- Contador regresivo de **60 segundos** (monospaced, color amber-600).
- **Botón "Cerrar sesión"**: llama `handleLogout()` inmediatamente.
- **Botón "Continuar"**: llama `handleExtendSession()`.

### 10.4 Extensión de Sesión

```javascript
const handleExtendSession = async () => {
  try {
    await checkSession();  // GET /auth/me → renueva la cookie en el backend
  } catch (e) {
    console.error("No se pudo extender la sesión:", e);
  }
  lastActivityRef.current = Date.now();  // reinicia temporizador local
  setShowTimeoutWarning(false);          // cierra el modal
};
```

### 10.5 Contador Regresivo

Al mostrarse el modal, se inicia un segundo `setInterval` de 1 segundo que decrementa `timeoutCountdown` de 60 a 0. Al llegar a 0, se llama `handleLogout()`. Ambos intervals se limpian correctamente en el cleanup de `useEffect`.

---

## 11. Control de Acceso por Roles (RBAC)

### 11.1 Roles del Sistema

| Rol | Identificador | Descripción |
|---|---|---|
| Administrador | `admin` | Acceso total. Gestión de nodos, usuarios, configuración del sistema. |
| Investigador ICUAP | `icuap` | Registro de muestras físicas de laboratorio, generación de reportes. |
| Operador Técnico | `operador` | Monitoreo activo, resolución de alertas operativas. |
| Visualizador | `visualizador` | Solo lectura de telemetría, mapas y estado del sistema. |

### 11.2 Hook `usePermissions(rol)`

Centraliza toda la lógica de permisos. Los componentes **no comparan strings de rol directamente** — siempre consumen booleanos del hook.

```javascript
const permissions = usePermissions(auth?.user?.rol);
```

**Permisos disponibles:**

| Permiso | `admin` | `icuap` | `operador` | `visualizador` |
|---|:---:|:---:|:---:|:---:|
| `canManageNodes` (CRUD nodos) | ✅ | ❌ | ❌ | ❌ |
| `canManageUsers` (crear usuarios) | ✅ | ❌ | ❌ | ❌ |
| `canEditThresholds` (umbrales NOM) | ✅ | ❌ | ❌ | ❌ |
| `canEditMap` (arrastrar marcadores) | ✅ | ❌ | ❌ | ❌ |
| `canRecordSamples` (POST /muestras) | ✅ | ✅ | ❌ | ❌ |
| `canAnnotateSample` (notas en muestras) | ✅ | ✅ | ❌ | ❌ |
| `canResolveAlerts` (resolver alertas) | ✅ | ✅ | ✅ | ❌ |
| `canViewReports` (ver y generar reportes) | ✅ | ✅ | ❌ | ❌ |
| `canViewData` (leer telemetría) | ✅ | ✅ | ✅ | ✅ |

### 11.3 Aplicación de Permisos en la UI

Los permisos se usan para:
1. **Mostrar/ocultar elementos:** botones de acción, pestañas de navegación ("Reportes").
2. **Deshabilitar controles:** botones con `disabled` attr + clase `opacity-40 cursor-not-allowed` + atributo `title` con explicación.
3. **Condicionar componentes:** modales y formularios solo se montan cuando el rol lo permite.
4. **Condicionar props:** `canResolve` en `GlobalAlertsDrawer` y `Overview` controla la visibilidad de los botones de resolución.

### 11.4 Registro de Usuarios

- **Auto-registro** (`Register.jsx`): El rol siempre es `"visualizador"`. No es seleccionable.
- **Creación por Admin** (`UsuarioForm.jsx`): El administrador puede asignar cualquiera de los 4 roles, con una interfaz visual de cuadrícula con codificación por colores.

---

## 12. Tolerancia a Fallos y Manejo de Errores

### 12.1 ErrorBoundary (Errores de Renderizado React)

`ErrorBoundary` es un **Class Component** que captura errores de renderizado en el subárbol de React:

```javascript
// Solo se usa alrededor de NodoConfig, que es el componente más complejo y crítico
<ErrorBoundary>
  <NodoConfig ... />
</ErrorBoundary>
```

Actualmente muestra un overlay rojo con el stack trace completo. Es una implementación de **desarrollo** — en producción debería mostrar un mensaje amigable y reportar el error a un servicio externo (Sentry, etc.).

### 12.2 Pantallas de Error y Carga

`App.jsx` implementa pantallas de estado intermedias:

```javascript
if (loadingNodes) return <LoadingScreen message="Cargando nodos…" />;
if (nodesError) return <ErrorScreen message={nodesError} onRetry={loadNodes} />;
if (initializingTelemetry) return <LoadingScreen message="Sincronizando telemetría…" />;
```

- **`LoadingScreen`**: Spinner circular + mensaje. Bloquea toda la interfaz.
- **`ErrorScreen`**: Mensaje de error + botón "Reintentar" que llama `loadNodes()`.

### 12.3 Manejo de Errores en Componentes

Cada componente con operaciones asíncronas tiene su propio estado de error local:

**Patrón estándar:**
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleAction = async () => {
  setLoading(true);
  setError("");
  try {
    await apiCall();
    // éxito
  } catch (err) {
    setError(err.message || "Error genérico");
  } finally {
    setLoading(false);
  }
};
```

Componentes y sus estrategias de error:

| Componente | Error visible | Reintentar |
|---|---|---|
| `App.jsx` - carga de nodos | `ErrorScreen` full-page | Botón "Reintentar" |
| `SingleView.jsx` - nodo sin datos | Banner + botón de reintentar | `loadTelemetry(selectedNode)` |
| `ExpandedChart.jsx` - historial | Overlay dentro del modal | No (cerrar y reabrir) |
| `NodoForm.jsx` - registro nodo | `Alert` component (rojo) | Nuevo intento en el mismo form |
| `NodoConfig.jsx` - editar/eliminar | Banner `msg` en el panel | Reintentar acción manual |
| `UsuarioForm.jsx` - crear usuario | `Alert` component (rojo) | Nuevo intento en el mismo form |
| `Reportes.jsx` - generar reporte | Banner de error en formulario | Nuevo intento |
| `Reportes.jsx` - descargar PDF | `console.error()` silencioso | — |

### 12.4 Carga de Telemetría con Retry

En `SingleView.jsx`, si un nodo tiene `sinDatos: true` y `errorTelemetria`, se muestra:

```jsx
<button onClick={() => loadTelemetry(selectedNode)}>Reintentar</button>
```

Esto reintenta la carga de telemetría sin tener que recargar la aplicación.

### 12.5 Carga Silenciosa vs. Explícita

- **`loadTelemetrySilent`**: Actualiza la telemetría de un nodo sin activar spinners globales. Se usa durante la inicialización paralela de todos los nodos.
- **`loadTelemetry`**: Activa `loadingTelemetry` (spinner en SingleView). Se usa al seleccionar un nodo que aún no tiene historial.

### 12.6 Prevención de Doble Carga

Un `useRef` previene cargas redundantes de telemetría:

```javascript
const prevSelectedId = useRef(null);
useEffect(() => {
  if (!auth?.user || !selectedNode?.id) return;
  if (selectedNode.id === prevSelectedId.current) return;  // ya cargado
  if (selectedNode.history) return;                         // ya tiene datos
  prevSelectedId.current = selectedNode.id;
  loadTelemetry(selectedNode);
}, [selectedNode?.id]);
```

---

## 13. Páginas (Views)

### 13.1 `Login.jsx`

Vista de inicio de sesión con dos paneles (desktop) / un panel (móvil).

**Estado local:**
- `usuario`, `password`, `showPass`, `error`, `loading`, `isMobile`

**Flujo:**
1. Validación client-side: ambos campos no vacíos.
2. `login(email, password)` → `POST /auth/login`.
3. Éxito: `onLogin(data.usuario)` → `App.jsx` guarda en sessionStorage y actualiza auth.
4. Error: mensaje en banner rojo con animación `animate-shake`.

**Efecto visual:**
- `WaterRippleGL` (WebGL) en el fondo izquierdo, **solo en desktop** (`!isMobile`).
- `WaterBubblesGL` (@tsparticles) superpuesto en desktop.
- El movimiento del mouse/touch activa `rippleRef.current?.addRipple(x, y)`.
- En móvil, el fondo es solo un gradiente CSS.
- Un `useEffect` con `ResizeObserver` actualiza `isMobile` al cambiar el tamaño de la ventana.

### 13.2 `Register.jsx`

Auto-registro de cuentas nuevas. El rol es siempre `visualizador`.

**Estado local:**
- `form` (campos), `fieldErrors` (por campo), `error` (global), `loading`, `success`, `userData`

**Validación por campo (en tiempo real y al submit):**
- Importa `validateField` desde `../utils/validations`.
- Valida `nombreUsuario`, `email` (formato), `password` (longitud mínima).
- Al enviar, re-valida todos los campos aunque ya estén validados.

**Nota técnica importante:** Usa `fetch` nativo directamente (no el módulo `api.js`) para `POST /api/v1/auth/register`. Esto es una inconsistencia respecto a `UsuarioForm.jsx` que usa `api.post("/auth/register")` (ver §21).

### 13.3 `Overview.jsx`

Vista general del sistema con gráficas multi-nodo.

**Componente `MultiNodeParamCard`:**
- Recibe todos los nodos con historial y un parámetro.
- Calcula `buildMultiNodeData()`: construye una línea de tiempo unificada para todos los nodos, propagando el último valor conocido para garantizar continuidad visual.
- Muestra las últimas `OVERVIEW_POINTS = 10` muestras.
- Al hacer clic: `onExpandParam(param)` → abre `MultiNodeExpandedChart`.

**Panel de Notificaciones:**
- Sidebar derecho que lista alertas activas con valor leído, límite NOM-127, diferencia y hora.
- Botón "Marcar resuelta" visible solo para roles con `canResolve`.

**Actualización en tiempo real:**
- Las tarjetas se actualizan automáticamente cuando `nodes` cambia (via WebSocket).
- Las gráficas se actualizan sin animación de dibujo (`isAnimationActive={false}`) para evitar parpadeos.

### 13.4 `SingleView.jsx`

Vista de telemetría de un nodo individual. **Componente puramente presentacional** (sin estado local ni llamadas API).

**Cuatro estados posibles:**
1. `!selectedNode` → mensaje "Selecciona un nodo".
2. `loadingTelemetry && !nodeReady` → spinner de carga.
3. `selectedNode.sinDatos` → mensaje de sin datos / error con botón de reintentar.
4. `nodeReady` → grilla de `ParameterCard` para los 5 parámetros.

**Layout especial:** `conductividad` se filtra de la grilla estándar y se renderiza aparte con `lg:col-span-2 xl:col-span-2` para ocupar más espacio horizontal.

### 13.5 `NodeMap.jsx`

Mapa interactivo georreferenciado con Leaflet.

**Características clave:**
- **Carga diferida:** Leaflet se importa con `import("leaflet")` dinámico para no incluirlo en el bundle principal.
- **Capa de tiles:** CartoDB `light_all` (minimalista, sin ruido visual).
- **Restricción geográfica:** El mapa está limitado a los bounds de BUAP Ciudad Universitaria (`maxBoundsViscosity: 1.0`).
- **Persistencia de posiciones:** Las coordenadas de cada nodo se guardan en `localStorage` bajo la clave `"aquamonitor_node_positions"`.
- **Marcadores SVG dinámicos:** Los íconos se generan como SVG inline con `L.divIcon()`. El color refleja el estado del nodo (verde/rojo/gris). El nodo seleccionado tiene un anillo pulsante extra.
- **Modo de edición admin:** Solo administradores pueden activar el modo "drag" para reposicionar marcadores. El botón "Restablecer posiciones" borra el localStorage y vuelve a posiciones por defecto.
- **Popup de nodo:** Muestra todas las lecturas actuales con indicadores de cumplimiento NOM-127.
- **Sidebar de nodos:** Lista lateral filtrable; en móvil es un overlay con backdrop.

### 13.6 `Reportes.jsx`

Generación y gestión de reportes PDF de cumplimiento NOM-127.

**Flujo de generación:**
1. Seleccionar nodo + rango de fechas.
2. Validación: nodo requerido, ambas fechas requeridas, fecha inicio < fecha fin.
3. `POST /reportes/generar` → respuesta Blob PDF + headers.
4. Descarga automática del PDF con nombre `kanan_reporte_<ubicacion>_<inicio>_<fin>.pdf`.
5. Actualización de la lista de reportes.

**Lista de reportes:**
- Muestra: nodo, ubicación, fecha de generación, periodo, resultado NOM-127, quién lo generó.
- Badge verde/rojo para cumplimiento.
- Botón de descarga por fila (con estado de loading individual por `downloadingId`).
- Error de descarga individual es silencioso (solo `console.error`).

---
## 14. Componentes

### 14.1 `Header.jsx`

Barra de navegación principal. Recibe todos los permisos del usuario como props.

**Funcionalidades:**
- **Tabs de vista:** `overview`, `dashboard`, `map`, y `reportes` (condicional a `canViewReports`).
- **Selector de nodo:** Dropdown con búsqueda visual por nombre, estado y última lectura de pH/temperatura. Solo visible en vista `dashboard`.
- **Campana de alertas:** Badge rojo pulsante con contador. Abre `GlobalAlertsDrawer`.
- **Menú de usuario:** Nombre + badge de rol. Acciones admin condicionales. Confirmación de logout en dos pasos (`showLogoutConfirm`).
- **Hook `useClickOutside`:** Custom hook reutilizado para los tres dropdowns (nodos, usuario, menú móvil). Cierra el dropdown al hacer clic fuera del elemento referenciado.
- **Responsive:** Menú hamburguesa en móvil.

### 14.2 `ParameterCard.jsx`

Tarjeta de parámetro individual para `SingleView`.

- Muestra valor actual (monospace grande), unidad, y rango NOM-127.
- Mini `LineChart` de Recharts con `isAnimationActive={false}` (sin parpadeo en updates).
- Fondo rojo suave si el valor está fuera de rango.
- Truco de animación inicial: el primer render tiene `chartData = []`, el segundo render (post-`isMounted`) tiene los datos reales, para disparar la animación de entrada de Recharts **solo la primera vez**.
- **Acciones contextuales al pasar el cursor (Hover):** Al posicionar el puntero en la esquina superior derecha, se despliega una capa interactiva con botones para guardar una "Muestra" oficial ICUAP y para ver el "Historial" extendido.
- Clic abre `ExpandedChart`.

### 14.3 `ExpandedChart.jsx`

Modal de historial ampliado para un parámetro de un nodo individual.

- Carga `GET /telemetria/:nodoId?limit=30` al montar como comportamiento por defecto.
- **Filtro por Rango con Precisión de Tiempo:** Integra un selector de fecha normal (`<input type="date">`) y un componente custom de hora/minutos deslizable (`ScrollTimePicker`), permitiendo consultar `fetchTelemetriaRango` sobre la hora/minuto exacto seleccionado y recalculando dinámicamente promedio, mínimo, máximo e infracciones.
- **Acción Aceptar:** Cambiado el botón de confirmación de "Aplicar" a "Aceptar" para una mejor semántica, aplicando el filtro y cerrando el dropdown de fecha y hora.
- `AreaChart` (área rellena con gradiente) con 280px de altura fija.
- Estadísticas: promedio, mínimo, máximo, conteo de muestras fuera de norma.
- `isAnimationActive` usa el default de Recharts (animado en carga inicial). No recibe updates en tiempo real.
- Cierre con tecla Escape o click en backdrop.

### 14.4 `MultiNodeExpandedChart.jsx`

Modal comparativo de todos los nodos para un parámetro específico.

- **Datos en memoria y consultas paralelas:** Derivados por defecto con `useMemo` del prop `nodes` (las últimas 10 muestras del historial ya cargado). Al aplicar un rango de tiempo, realiza consultas asíncronas concurrentes (`Promise.all`) a `fetchTelemetriaRango` para todos los nodos activos en el periodo exacto.
- **Selector de Tiempo de Precisión:** Integra selectores de fecha tradicionales y componentes deslizables de hora/minutos `<ScrollTimePicker />`, aplicando el rango y cerrando el dropdown mediante el botón de confirmación "Aceptar".
- `LineChart` con una línea por nodo. Paleta de colores `NODE_PALETTE` cíclica.
- Tabla comparativa: lectura actual, promedio, mínimo, máximo, conteo de muestras fuera de norma.
- **Animación inteligente:** Animado al abrir (1500ms), luego `isAnimationActive={false}` para updates en tiempo real sin parpadeos (`hasAnimated` state + timer).
- Cierre con tecla Escape.

### 14.5 `GlobalAlertsDrawer.jsx`

Panel lateral deslizante de alertas activas.

- Overlay backdrop + drawer a la derecha (z-index: 100/110).
- Calcula desviación de la norma (`+X.XX` o `-X.XX`).
- Resuelve ubicación: `alerta.ubicacion` → `nodes.find(...)?.ubicacion` → `"Nodo desconocido"`.
- Botón "Marcar todo como resuelto" visible solo con `canResolve`.
- Cierre con Escape o clic en backdrop.

### 14.6 `NodoForm.jsx`

Formulario de registro de nodos (solo admin).

- Validación: MAC regex estricto `^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$`, ubicación 3-200 chars.
- **Opciones avanzadas colapsables:** Incluye entrada para la versión de firmware (opcional) y un panel interactivo de configuración de umbrales de alerta personalizados (pH, temperatura, conductividad, turbidez y TDS) inicializados con los límites oficiales de la NOM-127.
- **Persistencia Secuencial:** Registra primero el nodo mediante `registrarNodo` y, tras una respuesta exitosa, ejecuta secuencialmente `editarUmbralesDeNodo` en el backend para aplicar los límites personalizados.
- **Scroll Seguro:** La etiqueta del formulario limita su altura máxima (`max-h-[70vh]`) con scrollbar interno para evitar desbordes visuales.
- Transición form → `SuccessState` al registrar.

### 14.7 `NodoConfig.jsx`

Panel de edición y eliminación de nodos (solo admin).

- Layout de dos paneles: lista de nodos a la izquierda, formulario de edición a la derecha.
- **Configuración de firmware y umbrales:** La entrada de la versión de firmware se ha movido al acordeón colapsable de **Opciones avanzadas**, donde también se pueden visualizar y modificar los umbrales específicos de alerta de parámetros (pH, temperatura, conductividad, turbidez, TDS), guardándose secuencialmente con `editarNodo` y `editarUmbralesDeNodo`.
- Toggle visual de `activo/inactivo` (switch custom).
- Confirmación de dos pasos para eliminar (`confirmDelete` state).
- Callback `onNodesChanged(nodoActualizado)` / `onNodesChanged(null, idEliminado)` para sincronizar el estado en `App.jsx`.
- Comentario en código: *"La telemetría histórica en MongoDB se conserva"* al eliminar.

### 14.8 `UsuarioForm.jsx`

Formulario de creación de usuarios (solo admin).

- Selector de rol como cuadrícula 2x2 con colores por rol.
- Todos los roles disponibles (a diferencia del auto-registro).
- Usa `api.post("/auth/register")` (el default export de axios, no la función nombrada de `api.js`).
- Validación mínima: campos requeridos (sin validación de formato de email ni strength de contraseña).

### 14.9 `MuestraModal.jsx`

Formulario modal para el registro de muestras oficiales del ICUAP (BUAP).

- **Estructura unificada:** Diseñado utilizando el kit de diseño compartido (`Modal`, `InputField`, `Alert`, `SuccessState`).
- **Autocompletado inteligente:** Carga automáticamente los valores actuales del sensor en tiempo real para todos los parámetros medidos y permite su edición manual antes del envío.
- **Persistencia:** Guarda la muestra oficial llamando a `registrarMuestra` en el servidor y muestra una animación de éxito con `SuccessState` tras confirmar.
- **Scroll Seguro:** El contenedor limita su altura (`max-h-[75vh]`) y cuenta con scrolling interno mediante `custom-scrollbar`.

### 14.10 `StatusBar.jsx`

Barra compacta de estado del nodo seleccionado en `SingleView`.

- `ParamPill` por cada parámetro: label, valor monospace, barra de progreso porcentual dentro del rango NOM-127.
- Barra de progreso: `pct = clamp(((valor - min) / (max - min)) * 100, 0, 100)`.
- Color rojo si fuera de rango.
- Retorna `null` si no hay nodo seleccionado.

### 14.11 `WaterRippleGL.jsx`

Efecto de agua animado en WebGL puro (sin librerías de gráficos 3D).

**Shaders:**
- **Vertex shader:** Quad de pantalla completa (2 triángulos).
- **Fragment shader:** 4 capas de ondas sinusoidales ambientales + hasta 8 ripples de ratón con decaimiento gaussiano.

**Parámetros uniformes del fragment shader:**
- `u_time`: tiempo en segundos desde el inicio (para la animación base).
- `u_ripples[8]`: array de 8 vec3 `(x_uv, y_uv, birth_time)` para los ripples de mouse.
- `u_ripple_count`: número de ripples activos actualmente.

**Exposición de API via `forwardRef` + `useImperativeHandle`:**
```javascript
// Parent (Login.jsx):
const rippleRef = useRef(null);
rippleRef.current?.addRipple(clientX, clientY);

// WaterRippleGL:
useImperativeHandle(ref, () => ({ addRipple }), [addRipple]);
```

**Buffer circular:** Máximo 8 ripples simultáneos. Al añadir un 9°, se descarta el más antiguo con `ripples.shift()`.
**Throttle:** Se ignoran ripples con menos de 50ms de separación para no saturar la GPU.
**Cleanup:** `cancelAnimationFrame`, `ResizeObserver.disconnect()`, `gl.deleteProgram/Buffer`.

### 14.12 `WaterBubblesGL.jsx`

Fondo de burbujas animadas usando `@tsparticles/react` (librería).

- 120 partículas circulares flotando hacia arriba.
- Hover: modo `repulse` (las burbujas huyen del cursor).
- Dos grupos de opacidad para simular profundidad.
- Engine inicializado una vez con `initParticlesEngine` en `useEffect([])`.
- Retorna `null` hasta que el engine esté listo.

### 14.13 Componentes Comunes (`common/`)

| Componente | Props | Descripción |
|---|---|---|
| `Alert` | `message, type="error"` | Banner de alerta. Tipos: `error`, `success`, `info`. Retorna `null` si sin mensaje. |
| `Modal` | `isOpen=true, onClose, title, subtitle, children` | Contenedor modal. Cierra con clic externo. Ancho máx. `md` (448px). |
| `InputField` | `label, icon, error, type, ...props` | Input con label, ícono izquierdo, toggle de contraseña, mensaje de error. |
| `SuccessState` | `title, subtitle, children` | Estado de éxito con ícono verde y mensaje. |
| `ScrollTimePicker` | `value, onChange, disabled` | Componente interactivo para horas y minutos. Soporta desplazamiento con la rueda del ratón (scroll/wheel) para incrementar/decrementar, edición de texto manual con validación y clamping automático, e inicialización automática con la hora del sistema. |

---

## 15. Hooks Personalizados

### `usePermissions(rol: string)`

**Archivo:** `src/hooks/usePermissions.js`

Centraliza la matriz de permisos del sistema RBAC. Debe ser la **única fuente de verdad** para la lógica de acceso en componentes.

```javascript
const { canManageNodes, canViewReports, roleLabel, rol } = usePermissions(auth?.user?.rol);
```

Expone adicionalmente:
- `rol`: el string del rol sin procesar (`"admin"`, etc.).
- `roleLabel`: etiqueta legible (`"Administrador"`, `"ICUAP"`, etc.).

### `useClickOutside(ref, onClose)` (local en Header.jsx)

Cierra dropdowns al detectar un clic fuera del elemento referenciado. Implementado directamente en `Header.jsx` (no exportado globalmente). Candidato a mover a `hooks/` si se reutiliza en más componentes.

---

## 16. Constantes y Modelos de Datos

**Archivo:** `src/constants.js`

### 16.1 Límites NOM-127 (`NOM_127_LIMITS`)

```javascript
{
  ph:            { min: 6.5,  max: 8.5,    unit: "",      label: "pH" },
  turbidez:      { min: 0,    max: 5,      unit: "NTU",   label: "Turbidez" },
  conductividad: { min: 0,    max: 1500,   unit: "µS/cm", label: "Conductividad" },
  temperatura:   { min: 0,    max: 40,     unit: "°C",    label: "Temperatura" },
  tds:           { min: 0,    max: 1000,   unit: "mg/L",  label: "TDS" },
}
```

### 16.2 Colores por Parámetro (`PARAM_COLORS`)

```javascript
{ ph: "#2333ce", turbidez: "#0891b2", conductividad: "#7c3aed", temperatura: "#ddc020ff", tds: "#059669" }
```

### 16.3 Orden de Parámetros (`PARAMS`)

```javascript
["ph", "turbidez", "conductividad", "temperatura", "tds"]
```

El orden de este array determina el orden de renderizado en todas las grillas.

### 16.4 Función `telemetryToPoint(entry, param)`

Transforma una entrada de telemetría cruda a un punto de gráfica:
```javascript
{
  time:      "14:30:05",           // HH:MM:SS — llave de agrupación en multi-nodo
  date:      "25 may.",            // para el eje X en historial diario
  fullLabel: "25 may. 14:30:05",  // para tooltip completo
  value:     7.2,                  // valor numérico del parámetro
  timestamp: 1748131805000,        // ms desde epoch — para ordenamiento cronológico
}
```

### 16.5 Función `buildHistory(telemetry, limit?)`

Transforma el array de telemetría (newest→oldest) en un objeto de historial por parámetro (oldest→newest, listo para gráficas):
```javascript
{
  ph:            [{ time, value, ... }, ...],
  turbidez:      [...],
  conductividad: [...],
  temperatura:   [...],
  tds:           [...],
}
```

### 16.6 Función `buildNode(apiNodo)`

Construye el objeto de nodo normalizado a partir de la respuesta del backend:
```javascript
{
  id:               "uuid",
  node_id:          "Nodo 6B:2F",  // identificador visual: "Nodo " + últimos 5 chars de MAC
  ubicacion:        "Edificio norte",
  version_firmware: "2.1",
  fecha_alta:       "2025-01-15T...",
  mac:              "A4:CF:12:45:6B:2F",
  activo:           true,
  status:           "activo",   // derivado de activo boolean
  timestamp:        null,       // se pobla al cargar telemetría
  valores:          null,       // se pobla al cargar telemetría
  history:          null,       // { ph: [...], ... } HISTORY_LIMIT muestras
  fullHistory:      null,       // { ph: [...], ... } todas las muestras
  x: 42,                        // posición % aleatoria (usada por NodeMap como fallback)
  y: 28,
}
```

---

## 17. Diseño y Sistema Visual

### 17.1 Paleta de Colores

El sistema de diseño se basa en la paleta institucional BUAP, extendida en `tailwind.config.js`:

```javascript
buap: {
  50:  "#eff4ff",   // fondos de hover muy suaves
  100: "#dce6fd",   // fondos de badges
  200: "#c0d0fc",   // bordes suaves
  300: "#96b1fa",
  400: "#6489f5",
  500: "#4063ef",
  600: "#2b44e3",
  700: "#2333ce",   // color principal (botones, acentos)
  800: "#232aa6",   // hover de botones
  900: "#002060",   // texto primario oscuro
  950: "#01134a",   // fondo más oscuro
}
```

### 17.2 Tipografía

- **DM Sans** (9pt–40pt, pesos 300–700): texto de interfaz general.
- **JetBrains Mono** (pesos 400–500): valores numéricos, MACs, timestamps, contadores.

Ambas se importan desde Google Fonts en `index.css`.

### 17.3 Sombras Personalizadas

```javascript
card:    "0 1px 3px rgba(0,32,96,0.07), 0 1px 2px rgba(0,32,96,0.05)"
card-md: "0 4px 12px rgba(0,32,96,0.09), 0 1px 4px rgba(0,32,96,0.06)"
card-lg: "0 8px 24px rgba(0,32,96,0.12), 0 2px 8px rgba(0,32,96,0.07)"
```

Basadas en el tono azul oscuro BUAP para mayor cohesión visual.

### 17.4 Animaciones Personalizadas

```javascript
"fade-in":  "fadeIn 0.2s ease-out"     // entrada suave + translateY(4px)
"pulse-dot": "pulse-dot 2s infinite"   // para indicadores de estado en tiempo real
"spin-slow": "spin 0.8s linear infinite" // spinner de carga
shake:       "shake 0.3s ease"          // error en formularios
```

### 17.5 Scrollbar Personalizado

La clase utilitaria `scrollbar-none` oculta scrollbars en paneles sin eliminar el scroll funcional:

```css
/* index.css */
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
```

Usada principalmente en el panel de cards de `Overview.jsx` y el sidebar de `NodeMap.jsx`.

### 17.6 Componentes CSS en `@layer components`

Clases de componentes definidas en `index.css`:

| Clase | Descripción |
|---|---|
| `.card` | `bg-white rounded-2xl border border-slate-200 shadow-card` |
| `.card-hover` | `.card` + `transition-shadow hover:shadow-card-md` |
| `.btn-primary` | Botón azul BUAP con estados hover, active, disabled |
| `.btn-ghost` | Botón transparente con hover en azul suave |
| `.chip` | Badge/etiqueta base |
| `.chip-success/danger/warning/neutral` | Variantes de colores para chips |
| `.label-sm` | Label de campo: mayúsculas, tracking, slate-500 |
| `.input-base` | Input estándar con focus ring y transiciones |

---

## 18. Animaciones y Rendimiento de Gráficas

### 18.1 Problema: Parpadeos en Recharts

Recharts ejecuta una **animación de entrada** (dibujo de izquierda a derecha) cada vez que el array de datos cambia de referencia. En una aplicación con WebSockets, los datos cambian cada pocos segundos, causando parpadeos constantes.

### 18.2 Solución Implementada

**Tarjetas pequeñas (Overview y SingleView):** Animación completamente desactivada:
```jsx
<Line isAnimationActive={false} ... />
```

**Modal comparativo (`MultiNodeExpandedChart`):** Animación inteligente de un solo ciclo:
```javascript
const [hasAnimated, setHasAnimated] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setHasAnimated(true), 1500); // duración default de Recharts
  return () => clearTimeout(timer);
}, []);
// ...
<Line isAnimationActive={!hasAnimated} ... />
```

Al abrir el modal por primera vez, la animación corre. Después de 1500ms, `hasAnimated` se vuelve `true` y los updates en tiempo real se aplican sin animación.

**Modal de historial individual (`ExpandedChart`):** Mantiene la animación de Recharts activa. No recibe updates en tiempo real (solo carga datos al montar), por lo que no tiene riesgo de parpadeos.

### 18.3 Datos en Memoria para el Modal Comparativo

`MultiNodeExpandedChart` fue refactorizado para usar `useMemo` sobre el prop `nodes` en lugar de hacer llamadas de red al abrirse:

```javascript
const chartData = useMemo(() => mergeHistories(resultsWithData, param), [resultsWithData, param]);
const nodeStats = useMemo(() => resultsWithData.map(...), [resultsWithData, limits]);
```

Esto elimina el spinner de carga y los parpadeos causados por el ciclo loading→data al recibir cada update de WebSocket.

---

## 19. Configuración de Empaquetado (Vite)

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

- **Puerto de desarrollo:** 5173.
- **Proxy:** En desarrollo, las peticiones a `/api/*` se redirigen a `http://localhost:3000`. Esto evita problemas de CORS en desarrollo sin necesitar configurar CORS en el backend para el servidor de Vite.
- **Nota:** En producción, el servidor web (nginx, etc.) debe configurar el proxy equivalente o servir el frontend y el backend desde el mismo dominio.

**Scripts disponibles:**
```bash
npm run dev      # Servidor de desarrollo con HMR en :5173
npm run build    # Bundle de producción en dist/
npm run preview  # Preview del bundle de producción
```

---

## 20. Consideraciones de Despliegue

### 20.1 Build de Producción

```bash
cd frontend
npm run build
```

Genera `dist/` con:
- `index.html`
- `assets/index-[hash].js` (~771KB, ~220KB gzip)
- `assets/index-[hash].css` (~57KB, ~14KB gzip)
- `assets/leaflet-src-[hash].js` (~150KB, ~44KB gzip)

> **Advertencia de tamaño:** Vite reporta que el bundle JS supera 500KB. Para producción se recomienda implementar **code splitting** con `import()` dinámico para Leaflet y Recharts, que son las dependencias más pesadas.

### 20.2 Variables de Entorno en Producción

Crear `.env.production`:
```env
VITE_API_URL=https://api.kanan.ejemplo.com/api/v1
VITE_SOCKET_URL=https://api.kanan.ejemplo.com
```

O configurar las variables en el pipeline CI/CD antes de ejecutar `npm run build`.

### 20.3 Configuración de Servidor Web (nginx)

Para que el routing de la SPA funcione correctamente (las rutas deben resolver siempre a `index.html`):
```nginx
location / {
  root /var/www/kanan/dist;
  try_files $uri $uri/ /index.html;
}
```

### 20.4 CORS y Cookies

Para que las cookies HttpOnly funcionen cross-origin, el servidor debe responder con:
- `Access-Control-Allow-Origin: https://frontend.kanan.ejemplo.com` (no `*`)
- `Access-Control-Allow-Credentials: true`

El frontend ya envía `withCredentials: true` en todas las peticiones.

---

## 21. Deuda Técnica y Aspectos Pendientes

### 21.1 Funcionalidades No Conectadas a la UI

| Endpoint | Función en api.js | Estado |
|---|---|---|
| `GET /muestras` | `fetchMuestras` | Implementada en api.js. Sin página/sección dedicada independiente (solo registro a través de modal). |
| `PUT /muestras/:id/nota` | `actualizarNota` | Implementada en api.js. Sin interfaz de anotación. |

### 21.2 Inconsistencias de Código

| Componente | Inconsistencia |
|---|---|
| `Register.jsx` | Usa `fetch` nativo en lugar de `api.js` para `POST /auth/register`. |
| `UsuarioForm.jsx` | Usa el export default de axios (`api.post(...)`) en lugar de la función nombrada `login()`. Ambas son funcionalmente equivalentes pero rompen el patrón de abstracción. |
| `StatusBar.jsx` | Declara `PARAMS` localmente en lugar de importarlo de `constants.js`. |

### 21.3 Seguridad a Mejorar

| Aspecto | Estado | Recomendación |
|---|---|---|
| `ErrorBoundary` | Muestra stack trace completo | Implementar UI de error amigable en producción; integrar Sentry o similar para reportes. |
| `buildPopupHTML` en NodeMap | Concatena HTML de strings del backend | Sanitizar los datos de ubicación en el servidor. |
| Validación en `UsuarioForm` | Solo verifica que los campos no estén vacíos | Agregar validación de formato de email y strength de contraseña. |
| Timeout de inactividad | Solo en frontend | El backend debe tener su propio timeout independiente (ya lo tiene a 30min). |

### 21.4 Rendimiento a Optimizar

| Aspecto | Recomendación |
|---|---|
| Bundle size (771KB) | Code splitting dinámico para Leaflet y Recharts. |
| `enrichedNodes` | Se recalcula en cada render de `App.jsx`. Candidato a `useMemo`. |
| `buildMultiNodeData` | Se ejecuta en cada render de cada `MultiNodeParamCard`. Candidato a `useMemo` por `[nodes, param]`. |
| Node positions en mapa | `loadSavedPositions()` llama `JSON.parse(localStorage.getItem(...))` en cada re-render de NodeMap. Mover a estado inicial o `useMemo`. |

### 21.5 Funcionalidades Deseables Futuras

- **Sección de Muestras de Laboratorio dedicada** para roles `admin` e `icuap` (sección/página completa de muestras).
- **Notificaciones push del navegador** para alertas fuera del dashboard.
- **Exportación de datos** en CSV desde la vista de historial.
- **Modo oscuro** (dark mode) como preferencia de usuario.
- **Internacionalización** (i18n) si se requiere soporte multilingüe.

---

