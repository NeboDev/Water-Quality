import axios from 'axios';

const api = axios.create({
  // URL base del backend obtenida de variables de entorno con fallback a localhost
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// Interceptor de respuesta — maneja errores de sesión globalmente
// Si el backend devuelve 401 significa que la sesión expiró
api.interceptors.response.use(
  response => {
    if (response.data && response.data.success === false) {
      return Promise.reject(new Error(response.data.mensaje || 'Error de autenticación'));
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
    }
    // Formatea el error para mantener compatibilidad con el resto del código
    const mensaje = error.response?.data?.mensaje || `Error ${error.response?.status || 'desconocido'}`;
    return Promise.reject(new Error(mensaje));
  }
);

// auth

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}

export async function checkSession() {
  const { data } = await api.get("/auth/me");
  return data;
}

// nodos

export async function fetchNodos() {
  const { data } = await api.get("/nodos");
  return data;
}

export async function registrarNodo({ mac, ubicacion, version_fw }) {
  const { data } = await api.post("/nodos", { mac, ubicacion, version_fw });
  return data;
}

export async function editarNodo(id, campos) {
  const { data } = await api.put(`/nodos/${id}`, campos);
  return data;
}

export async function eliminarNodo(id) {
  const { data } = await api.delete(`/nodos/${id}`);
  return data;
}

// terlemetria

export async function fetchTelemetria(nodoId, limit = 50) {
  const { data } = await api.get(`/telemetria/${nodoId}?limit=${limit}`);
  return data.lecturas;
}

export async function fetchTelemetriaRango(nodoId, desde, hasta) {
  const { data } = await api.get(`/telemetria/${nodoId}/rango`, { params: { desde, hasta } });
  return data.lecturas;
}

// alertas

export async function fetchAlertas({ resuelta, nodo_id } = {}) {
  const params = {};
  if (resuelta !== undefined) params.resuelta = resuelta;
  if (nodo_id) params.nodo_id = nodo_id;
  const { data } = await api.get("/alertas", { params });
  return data.alertas;
}

export async function resolverAlerta(alertaId) {
  const { data } = await api.put(`/alertas/${alertaId}/resolver`);
  return data;
}

// muestras

export async function fetchMuestras({ nodo_id, limit = 10 } = {}) {
  const params = { limit };
  if (nodo_id) params.nodo_id = nodo_id;
  const { data } = await api.get("/muestras", { params });
  return data.muestras;
}

export async function registrarMuestra({ nodo_id, valores, nota = "" }) {
  const { data } = await api.post("/muestras", { nodo_id, valores, nota });
  return data;
}

export async function actualizarNota(muestraId, nota) {
  const { data } = await api.put(`/muestras/${muestraId}/nota`, { nota });
  return data;
}

// reportes

export async function fetchReportes() {
  const { data } = await api.get('/reportes');
  return data.reportes; // [{ id, fecha, cumple_nom, creado_en, mac, ubicacion, generado_por }]
}

export async function generarReporte({ nodo_id, fecha_inicio, fecha_fin }) {
  const response = await api.post(
    '/reportes/generar',
    { nodo_id, fecha_inicio, fecha_fin },
    { responseType: 'blob' }
  );
  return {
    blob: response.data,
    reporteId: response.headers['x-reporte-id'],
    cumpleNom: response.headers['x-cumple-nom'] === 'true',
  };
}

export async function descargarPdfReporte(id) {
  const response = await api.get(`/reportes/${id}/pdf`, { responseType: 'blob' });
  return response.data; // Blob PDF
}

export default api;
