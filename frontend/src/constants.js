export const NOM_127_LIMITS = {
  ph: { min: 6.5, max: 8.5, unit: "", label: "pH" },
  turbidez: { min: 0, max: 5, unit: "NTU", label: "Turbidez" },
  conductividad: { min: 0, max: 1500, unit: "µS/cm", label: "Conductividad" },
  temperatura: { min: 0, max: 40, unit: "°C", label: "Temperatura" },
  tds: { min: 0, max: 1000, unit: "mg/L", label: "TDS" },
};

export const PARAM_COLORS = {
  ph: "#2333ce",
  turbidez: "#0891b2",
  conductividad: "#7c3aed",
  temperatura: "#ddc020ff",
  tds: "#059669",
};

export const PARAMS = ["ph", "turbidez", "conductividad", "temperatura", "tds"];

export function telemetryToPoint(entry, param) {
  const d = new Date(entry.timestamp);
  return {
    time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    fullLabel: d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    value: entry.valores[param],
    timestamp: d.getTime(),
  };
}

// Build history map { ph: [...], turbidez: [...], ... } from telemetry array
// telemetry comes newest→oldest from API; we reverse for chronological charts
export function buildHistory(telemetry, limit = null) {
  const ordered = [...telemetry].reverse(); // oldest → newest
  const slice = limit ? ordered.slice(-limit) : ordered;
  const history = {};
  PARAMS.forEach((p) => {
    history[p] = slice.map((entry) => telemetryToPoint(entry, p));
  });
  return history;
}

// Build a full node object by merging API data sources
export function buildNode(apiNodo, umbrales = null) {
  return {
    id: apiNodo.id,
    node_id: "Nodo " + apiNodo.mac.slice(-5),
    ubicacion: apiNodo.ubicacion,
    version_firmware: apiNodo.version_fw || "1.0",
    fecha_alta: apiNodo.fecha_alta,
    mac: apiNodo.mac,
    activo: apiNodo.activo,                           // boolean — conservar para NodoConfig
    status: apiNodo.activo ? "activo" : "inactivo",
    timestamp: null,
    valores: null,
    history: null,
    fullHistory: null,
    umbrales: umbrales,                               // Store backend custom thresholds
    x: Math.floor(Math.random() * 70) + 15,
    y: Math.floor(Math.random() * 60) + 15,
  };
}
