# Documentación del Frontend: Kanan

Esta es la documentación técnica integral del frontend para el sistema de monitoreo de calidad del agua. 

## 1. Visión General del Proyecto
El frontend está desarrollado como una SPA (Single Page Application) utilizando **React 18** y empaquetado con **Vite**. Su propósito es consumir la API REST del backend, mantener una conexión en tiempo real vía WebSockets para los datos de telemetría, y renderizar una interfaz interactiva de paneles de control, mapas y gestión administrativa.

### Tecnologías Principales (Stack)
- **Framework Core:** React 18
- **Build Tool:** Vite
- **Estilos:** Tailwind CSS y PostCSS
- **Mapas Interactivos:** Leaflet (vía manipulación directa del DOM)
- **Gráficos:** Recharts
- **Comunicaciones HTTP:** Axios
- **Comunicaciones Tiempo Real:** Socket.io-client

## 2. Estructura de Directorios (`src/`)

```text
src/
├── api.js                # Lógica de llamadas HTTP con Axios (REST)
├── App.jsx               # Orquestador principal, manejo de estado global, auth y routing
├── constants.js          # Constantes compartidas (parámetros, límites, configuraciones base)
├── index.css             # Estilos globales y directivas de Tailwind
├── main.jsx              # Punto de entrada de la aplicación React
├── hooks/
│   └── usePermissions.js # Hook para gestión de permisos basada en roles (RBAC)
├── pages/                # Vistas principales de la aplicación
│   ├── Dashboard.jsx     # Vista detallada de telemetría para un nodo seleccionado
│   ├── Login.jsx         # Pantalla de inicio de sesión
│   ├── NodeMap.jsx       # Vista cartográfica de los nodos de medición
│   ├── Overview.jsx      # Panel de resumen general
│   ├── Register.jsx      # Pantalla de registro de cuenta
│   └── Reportes.jsx      # Generación y exportación de reportes
└── components/           # Componentes reutilizables de la interfaz gráfica
    ├── ErrorBoundary.jsx # Capturador de errores de renderizado en React
    ├── ExpandedChart.jsx # Modal para visualizar el histórico expandido en gráficos
    ├── GlobalAlertsDrawer.jsx # Panel lateral de alertas
    ├── Header.jsx        # Barra de navegación principal
    ├── NodoConfig.jsx    # Interfaz para configuración de nodos (Admin)
    ├── NodoForm.jsx      # Formulario para registro de nuevos nodos (Admin)
    ├── ParameterCard.jsx # Tarjetas que muestran lecturas individuales y minigráficos
    ├── StatusBar.jsx     # Barra de estado inferior
    ├── UsuarioForm.jsx   # Formulario para creación y asignación de usuarios (Admin)
    └── WaterRippleGL.jsx # Componente WebGL que renderiza el fondo animado
```

## 3. Arquitectura y Flujo de Datos

### 3.1. Estado Principal (`App.jsx`)
`App.jsx` actúa como el orquestador principal. Centraliza los siguientes estados:
- **Autenticación (`auth`)**: Valida la sesión del usuario obtenida del backend. Se utiliza `sessionStorage` para mantener la sesión viva entre recargas de pestaña, pero depende enteramente de la validación del backend (via HttpOnly cookies).
- **Listado de Nodos (`nodes`)**: Almacena todos los nodos obtenidos de la API y se actualizan dinámicamente si hay cambios en los web sockets.
- **Nodo Seleccionado (`selectedNode`)**: El nodo del cual se están visualizando activamente los detalles y su telemetría histórica/en tiempo real.
- **Alertas Globales (`globalAlerts`)**: Sistema de alertas alimentado en la primera carga por una llamada REST, y posteriormente de manera reactiva mediante WebSockets.

### 3.2. Comunicaciones en Tiempo Real (WebSockets)
Al autenticarse exitosamente, el frontend abre una conexión `socket.io` hacia el servidor. Se escuchan principalmente dos eventos:
- `telemetria:live`: Inyecta el último dato leído en la gráfica y tarjetas de los nodos afectados sin recargar la página.
- `alertas:nueva`: Dispara un aviso en el `GlobalAlertsDrawer` cuando un parámetro excede la norma NOM-127.

### 3.3. Manejo de Roles y Permisos (RBAC)
Los permisos son delegados a través del custom hook `usePermissions(role)`. El hook centraliza la lógica de permisos para los distintos roles (Admin, ICUAP, Operador, Visualizador), exponiendo booleanos como `canManageNodes`, `canResolveAlerts`, `canViewReports`, etc. Estos determinan el acceso a diferentes secciones y controles visuales.

## 4. Descripción de Páginas y Componentes Clave

1. **Overview (`pages/Overview.jsx`)**: Vista de aterrizaje. Muestra el estado actual del sistema de un vistazo y agrupa gráficas multi-nodo.
2. **Dashboard de Nodo (`pages/Dashboard.jsx`)**: Desgrana los parámetros ambientales medidos (Turbidez, pH, Temperatura, Conductividad, TDS, etc) utilizando **Recharts** para dibujar las líneas de tendencia para el nodo seleccionado en `App.jsx`.
3. **NodeMap (`pages/NodeMap.jsx`)**: Integra mapas georreferenciados mediante `leaflet` para localizar nodos en tiempo real y permite a los administradores reubicar los marcadores arrastrándolos.
4. **WaterRippleGL (`components/WaterRippleGL.jsx`)**: Un componente visual altamente inmersivo basado en fragment shaders (WebGL) que proporciona un efecto de ondulación de agua fluido utilizado en la experiencia de Login.

## 5. Decisiones de Diseño y UI/UX
- **Tailwind CSS** es utilizado exclusivamente como solución de diseño, prescindiendo de librerías de componentes rígidas, permitiendo una identidad visual personalizada (basada en tonos oscuros "BUAP" y elementos estilo "glassmorphism").
- **Feedback Asíncrono**: Uso estricto de spinners y *skeletons* durante la carga de telemetría y llamadas REST.

## 6. Seguridad y Manejo de Sesiones

### 6.1. Cookies HttpOnly vs LocalStorage
- **Protección contra XSS**: La aplicación **no** almacena tokens de sesión en el `localStorage`. El backend emite una cookie con el flag `HttpOnly`, lo que significa que el código JavaScript del frontend no puede acceder a ella ni leerla, mitigando de raíz el riesgo de ataques XSS.
- **Envío Automático**: Axios está configurado (`withCredentials: true`) para enviar la cookie en cada petición hacia el servidor automáticamente.

### 6.2. Inicios y Cierres de Sesión
- **Login**: Al iniciar sesión, el perfil de usuario devuelto (que no es un token sensible) se guarda en `sessionStorage` únicamente para restaurar el estado inicial (nombre, rol) si se recarga la pestaña.
- **Logout Seguro**: Al cerrar sesión (`handleLogout`), el frontend emite un request explícito al backend para invalidar la sesión y borrar la cookie.

### 6.3. Control de Acceso (RBAC)
La interfaz oculta paneles administrativos según los booleanos de `usePermissions`, pero la seguridad principal asume que **el frontend no es confiable**. Por ello, cualquier manipulación del DOM para mostrar interfaces no permitidas será rechazada con un `401/403` por el servidor al consultar los endpoints respectivos.

## 7. Estado de Integración de Endpoints (API)

A continuación se detalla el estado actual de la conexión de los endpoints del backend con la interfaz de usuario.

### ✅ Endpoints Conectados e Integrados
- **Autenticación**: `POST /auth/login` (`Login.jsx`), `POST /auth/logout` (`App.jsx`), `POST /auth/register` (`UsuarioForm.jsx`).
- **Gestión de Nodos**: `GET /nodos` (`App.jsx`), `POST /nodos` (`NodoForm.jsx`), `PUT /nodos/:id` y `DELETE /nodos/:id` (`NodoConfig.jsx`).
- **Telemetría y Alertas**: `GET /telemetria/:nodoId` (`App.jsx`, `ExpandedChart.jsx`), `GET /alertas` y `PUT /alertas/:alertaId/resolver` (`App.jsx`, `Overview.jsx`).
- **Reportes**: `GET /reportes`, `POST /reportes/generar` y `GET /reportes/:id/pdf` (`Reportes.jsx`).

### ⏳ Endpoints Pendientes de Conectar (Hacen falta en UI)
- **Autenticación**: `GET /auth/me` (`checkSession`). Actualmente la sesión visual se restaura desde `sessionStorage`. Puede implementarse para validar asíncronamente.
- **Telemetría Histórica**: `GET /telemetria/:nodoId/rango` (`fetchTelemetriaRango`) para incorporar un selector de fechas en las gráficas expandidas o reportes.
- **Gestión de Muestras Oficiales (Laboratorio)**: 
  - `GET /muestras`, `POST /muestras`, `PUT /muestras/:muestraId/nota`. Falta una sección específica/formulario para que roles operativos e investigadores del ICUAP suban comparativas manuales contra los sensores.

---
*Documentación generada automáticamente — Proyecto Kanan*
