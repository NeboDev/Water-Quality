# AquaMonitor — Dashboard IoT
**Sistema de monitoreo de calidad del agua · NOM-127-SSA1-2021 · BUAP**

---

## 🚀 Instalación rápida

```bash
cd SS
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

---

## 📁 Estructura del proyecto

```
water-monitor/
├── src/
│   ├── components/
│   │   ├── Header.jsx         # Barra superior: selector de nodo, toggle de vista
│   │   ├── StatusBar.jsx      # Resumen de parámetros en tiempo real
│   │   ├── ParameterCard.jsx  # Gráfica de línea con límites NOM-127
│   │   ├── BatteryIndicator.jsx # Estado de batería del nodo
│   │   └── NodeMap.jsx        # Mapa SVG de CU con nodos activos
│   ├── constants.js           # Límites NOM-127, colores, datos mock
│   ├── App.jsx                # Componente raíz
│   ├── App.css                # Estilos globales (tema oscuro industrial)
│   └── main.jsx               # Entry point
├── index.html
├── vite.config.js             # Proxy /api → backend Node.js
└── package.json
```

---

## 🔌 Integración con el backend

### Formato del JSON esperado desde tu API Express.js

```json
{
  "node_id": "ESP32-N01",
  "mac": "AA:BB:CC:DD:EE:01",
  "ubicacion": "Depósito Norte",
  "status": "activo",
  "version_firmware": "v1.2.3",
  "timestamp": "2026-03-17T10:30:00.000Z",
  "bateria": 87,
  "valores": {
    "ph": 7.2,
    "turbidez": 1.5,
    "conductividad": 312,
    "temperatura": 18.5,
    "tds": 205
  }
}
```

### Endpoints sugeridos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/nodes` | Lista todos los nodos con su estado actual |
| `GET` | `/api/nodes/:id/telemetry` | Historial de telemetría de un nodo (últimas 24h) |
| `GET` | `/api/nodes/:id/muestras` | Muestras oficiales del día |
| `GET` | `/api/nodes/:id/latest` | Última lectura del nodo |

### Conectar con datos reales

En `src/constants.js`, reemplaza `MOCK_NODES` con una llamada a tu API:

```js
// En App.jsx, reemplaza el estado inicial:
const [nodes, setNodes] = useState([]);

useEffect(() => {
  fetch("/api/nodes")
    .then(r => r.json())
    .then(data => {
      setNodes(data);
      setSelectedNode(data[0]);
    });
}, []);

// Para actualizaciones en tiempo real usa WebSocket:
useEffect(() => {
  const ws = new WebSocket("ws://localhost:3000");
  ws.onmessage = (e) => {
    const payload = JSON.parse(e.data);
    setNodes(prev => prev.map(n =>
      n.node_id === payload.node_id ? { ...n, ...payload } : n
    ));
  };
  return () => ws.close();
}, []);
```

---

## 📊 Parámetros NOM-127-SSA1-2021

| Parámetro | Mínimo | Máximo | Unidad |
|-----------|--------|--------|--------|
| pH | 6.5 | 8.5 | — |
| Turbidez | 0 | 5 | NTU |
| Conductividad | 0 | 1500 | µS/cm |
| Temperatura | 0 | 40 | °C |
| TDS | 0 | 1000 | mg/L |

---

## 🧩 Dependencias

- **React 18** — UI
- **Recharts** — Gráficas de series de tiempo
- **Vite** — Bundler y servidor de desarrollo

---

## 🔮 Próximas funcionalidades sugeridas

- [ ] Autenticación (JWT)
- [ ] Exportación de reportes PDF (NOM-127)
- [ ] Panel de alertas con historial
- [ ] Integración con bot de Telegram
- [ ] Modelos de IA para predicción de tendencias
- [ ] Vista de muestras oficiales con formulario de notas
