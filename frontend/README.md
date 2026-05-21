# AquaMonitor — Dashboard IoT (Frontend)
**Sistema de monitoreo de calidad del agua · NOM-127-SSA1-2021 · BUAP**

Esta carpeta contiene el código de la aplicación del cliente (Frontend) construida con **React, Vite, TailwindCSS y Recharts**. Esta aplicación es totalmente independiente y portátil, y puede ser compartida y ejecutada en cualquier máquina que cuente con acceso al backend de la aplicación.

---

## 🚀 Instalación y Ejecución Rápida

Sigue estos pasos para instalar y ejecutar el frontend de forma independiente:

1. **Instalar dependencias**:
   Ingresa a la carpeta del frontend e instala los paquetes necesarios usando tu gestor de paquetes preferido (`npm`, `pnpm` o `yarn`):
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz de esta carpeta (`frontend/`) para definir las direcciones del backend. Puedes basarte en el archivo `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Asegúrate de editar el archivo `.env` con la dirección IP o dominio de la máquina donde esté corriendo tu backend:
   ```env
   VITE_API_URL=http://localhost:3000/api/v1
   VITE_SOCKET_URL=http://localhost:3000
   ```

3. **Ejecutar en modo de desarrollo**:
   Inicia el servidor local de Vite:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver el dashboard.

4. **Compilar para producción**:
   Si deseas generar la versión de producción optimizada y lista para desplegar:
   ```bash
   npm run build
   ```
   Esto generará una carpeta `dist/` que contiene todos los archivos estáticos HTML/JS/CSS listos para ser servidos por Nginx, Apache o cualquier servidor web.

---

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/       # Componentes visuales reutilizables (gráficas, formularios, etc.)
│   ├── pages/            # Vistas principales de la app (Mapa, Login, Reportes, Vista General)
│   ├── hooks/            # Custom hooks de React (permisos basados en roles)
│   ├── constants.js      # Límites de la norma NOM-127-SSA1-2021 y configuraciones globales
│   ├── api.js            # Cliente Axios configurado con variables de entorno para llamadas REST
│   ├── App.jsx           # Componente principal y conexión a WebSockets (Socket.io)
│   ├── index.css         # Estilos globales y tokens de diseño TailwindCSS
│   └── main.jsx          # Punto de entrada de la aplicación
├── .env.example          # Plantilla para la configuración de endpoints
├── .env                  # Configuración local de endpoints activa
├── .gitignore            # Exclusión de archivos locales para repositorios Git
├── index.html            # Plantilla HTML base
├── tailwind.config.js    # Configuración de estilos y paleta de colores BUAP/industrial
├── postcss.config.js     # Procesamiento CSS
├── vite.config.js        # Configuración del bundler Vite
└── package.json          # Gestión de dependencias del frontend (autónomo)
```

---

## 🔌 Configuración de Variables de Entorno

El frontend se conecta con el backend a través de llamadas REST y WebSockets en tiempo real. Para permitir la portabilidad del frontend a otras máquinas, se utilizan las siguientes variables de entorno en el archivo `.env`:

* **`VITE_API_URL`**: La URL base para el backend de la API. Debe apuntar a la ruta `/api/v1`. Ejemplo: `http://192.168.1.100:3000/api/v1`.
* **`VITE_SOCKET_URL`**: La URL base del servidor Socket.io para la telemetría en tiempo real. Ejemplo: `http://192.168.1.100:3000`.

*Nota: Si estas variables no se configuran, la aplicación utilizará `http://localhost:3000` como dirección predeterminada.*

---

## 📊 Parámetros NOM-127-SSA1-2021 Soportados

El dashboard monitorea en tiempo real y evalúa según los límites oficiales del agua para uso y consumo humano:

| Parámetro | Mínimo | Máximo | Unidad |
|-----------|--------|--------|--------|
| **pH** | 6.5 | 8.5 | — |
| **Turbidez** | 0.0 | 5.0 | NTU |
| **Conductividad** | 0 | 1500 | µS/cm |
| **Temperatura** | 0.0 | 40.0 | °C |
| **TDS (Sólidos Disueltos Totales)** | 0 | 1000 | mg/L |

---

## 🧩 Dependencias Principales

El proyecto gestiona de forma autónoma las siguientes dependencias clave:

* **React 18** & **Vite**: Biblioteca de interfaz de usuario y herramienta de compilación ultrarrápida.
* **Recharts**: Visualización interactiva de gráficos de series temporales de telemetría.
* **Leaflet & React-Leaflet**: Mapas geográficos interactivos para visualizar la ubicación de los nodos.
* **Socket.io-client**: Conexión de sockets en tiempo real para recibir telemetría instantánea de los sensores.
* **Axios**: Cliente HTTP para realizar peticiones REST (auth, gestión de nodos, reportes).
* **@tsparticles/react** & **@tsparticles/slim**: Efecto visual interactivo de burbujas de agua para la pantalla de inicio de sesión.
* **TailwindCSS**: Estructura de estilos CSS utilitarios modernos y responsivos.
