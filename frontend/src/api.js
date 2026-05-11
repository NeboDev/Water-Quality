const BASE = "";

function headers(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

async function post(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

async function put(path, token, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

// ── Nodos ─────────────────────────────────────────────

// GET /api/v1/nodos
export async function fetchNodos(token) {
  const data = await get("/api/v1/nodos", token);
  return data; // Array of nodes directly
}

// POST /api/v1/nodos — solo admin
export async function registrarNodo(token, { mac, ubicacion, version_fw }) {
  return post("/api/v1/nodos", token, { mac, ubicacion, version_fw });
}

// PUT /api/v1/nodos/:id — solo admin (campos parciales: ubicacion, version_fw, activo)
export async function editarNodo(token, id, campos) {
  return put(`/api/v1/nodos/${id}`, token, campos);
}

// DELETE /api/v1/nodos/:id — solo admin
export async function eliminarNodo(token, id) {
  const res = await fetch(`/api/v1/nodos/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

// GET /api/v1/telemetria/:id
export async function fetchTelemetria(token, nodoId, limit = 50) {
  const data = await get(`/api/v1/telemetria/${nodoId}?limit=${limit}`, token);
  return data.lecturas; // array newest→oldest
}

// GET /api/v1/telemetria/:id/rango?desde=x&hasta=y
export async function fetchTelemetriaRango(token, nodoId, desde, hasta) {
  const params = new URLSearchParams({ desde, hasta });
  const data = await get(`/api/v1/telemetria/${nodoId}/rango?${params}`, token);
  return data.lecturas; // array newest→oldest
}

// ── Alertas ───────────────────────────────────────────

// GET /api/v1/alertas?resuelta=false&nodo_id=xxx
export async function fetchAlertas(token, { resuelta, nodo_id } = {}) {
  const params = new URLSearchParams();
  if (resuelta !== undefined) params.set("resuelta", resuelta);
  if (nodo_id) params.set("nodo_id", nodo_id);
  const data = await get(`/api/v1/alertas?${params}`, token);
  return data.alertas; // array
}

// PUT /api/v1/alertas/:id/resolver
export async function resolverAlerta(token, alertaId) {
  return put(`/api/v1/alertas/${alertaId}/resolver`, token);
}

// ── Muestras ──────────────────────────────────────────

// GET /api/v1/muestras?nodo_id=xxx&limit=50
export async function fetchMuestras(token, { nodo_id, limit = 10 } = {}) {
  const params = new URLSearchParams();
  if (nodo_id) params.set("nodo_id", nodo_id);
  params.set("limit", limit);
  const data = await get(`/api/v1/muestras?${params}`, token);
  return data.muestras; // array
}

// POST /api/v1/muestras
export async function registrarMuestra(token, { nodo_id, valores, nota = "" }) {
  return post("/api/v1/muestras", token, { nodo_id, valores, nota });
}

// PUT /api/v1/muestras/:id/nota
export async function actualizarNota(token, muestraId, nota) {
  return put(`/api/v1/muestras/${muestraId}/nota`, token, { nota });
}

