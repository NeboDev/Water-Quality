import { useState, useEffect, useCallback } from "react";
import { fetchReportes, generarReporte, descargarPdfReporte } from "../api";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// subs

function StatusBadge({ cumple }) {
  return cumple ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3.5" fill="#10b981" />
        <path d="M2.5 4l1 1 2-2" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Cumple NOM-127
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3.5" fill="#ef4444" />
        <path d="M2.5 2.5l3 3M5.5 2.5l-3 3" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      </svg>
      No cumple
    </span>
  );
}

// main component
export default function Reportes({ nodes }) {
  // state
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // form
  const [nodoId, setNodoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [fechaFin, setFechaFin] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null); // { cumpleNom }
  // Per-row download loading
  const [downloadingId, setDownloadingId] = useState(null);
  // loadlist
  const loadReportes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReportes();
      setReportes(data);
    } catch (e) {
      setError(e.message || "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReportes(); }, [loadReportes]);
  // generate
  const handleGenerar = async (e) => {
    e.preventDefault();
    setGenError("");
    setLastGenerated(null);

    if (!nodoId) { setGenError("Selecciona un nodo"); return; }
    if (!fechaInicio || !fechaFin) { setGenError("Selecciona el rango de fechas"); return; }
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      setGenError("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    setGenerating(true);
    try {
      const { blob, cumpleNom, reporteId } = await generarReporte({
        nodo_id: nodoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });

      // Auto-download
      const nodo = nodes.find((n) => n.id === nodoId);
      const label = nodo?.ubicacion || nodo?.node_id || reporteId;
      downloadBlob(blob, `kanan_reporte_${label}_${fechaInicio}_${fechaFin}.pdf`);

      setLastGenerated({ cumpleNom });
      await loadReportes(); // Refresh list
    } catch (e) {
      setGenError(e.message || "Error al generar el reporte");
    } finally {
      setGenerating(false);
    }
  };

  const handleDescargar = async (reporte) => {
    setDownloadingId(reporte.id);
    try {
      const blob = await descargarPdfReporte(reporte.id);
      downloadBlob(blob, `kanan_reporte_${reporte.id}.pdf`);
    } catch (e) {
      console.error("Error descargando reporte:", e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row gap-5 overflow-y-auto lg:overflow-hidden min-h-0">

      {/* ── Left panel: form ── */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">

        {/* Generate card */}
        <div className="card p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-buap-50 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="#2333ce" strokeWidth="1.3" />
                <path d="M5 5h6M5 7.5h6M5 10h4" stroke="#2333ce" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="13" cy="13" r="2.5" fill="#2333ce" />
                <path d="M12.3 13h1.4M13 12.3v1.4" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-buap-900 leading-none">Nuevo reporte</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cumplimiento NOM-127-SSA1-2021</p>
            </div>
          </div>

          <form onSubmit={handleGenerar} className="flex flex-col gap-3">
            {/* Node selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Nodo
              </label>
              <select
                value={nodoId}
                onChange={(e) => setNodoId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-buap-300 focus:border-buap-400 transition"
              >
                <option value="">Seleccionar nodo…</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.ubicacion || n.node_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                max={fechaFin}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-buap-300 transition"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-buap-300 transition"
              />
            </div>

            {/* Error */}
            {genError && (
              <p className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                {genError}
              </p>
            )}

            {/* Success feedback */}
            {lastGenerated && (
              <div className="rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" fill="#10b981" />
                  <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-[11px] font-semibold text-emerald-800">PDF generado y descargado</p>
                  <StatusBadge cumple={lastGenerated.cumpleNom} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="btn-primary justify-center w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v8M3.5 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1.5 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Generar y descargar PDF
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Right panel: list ── */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px] lg:min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-buap-900">Reportes generados</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Historial de reportes NOM-127</p>
          </div>
          <button
            onClick={loadReportes}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-buap-600 hover:bg-buap-50 transition-colors disabled:opacity-40"
            title="Actualizar lista"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              className={loading ? "animate-spin" : ""}
            >
              <path d="M2 7a5 5 0 015-5 5 5 0 014.33 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M10 3.5l1.5 1.5L13 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 7a5 5 0 01-5 5 5 5 0 01-4.33-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-buap-200 border-t-buap-600 animate-spin-slow" />
                <p className="text-xs font-medium">Cargando reportes…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="16" stroke="#fca5a5" strokeWidth="1.5" />
                  <path d="M18 10v10M18 24v2" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-xs font-semibold text-red-400">{error}</p>
                <button onClick={loadReportes} className="btn-ghost text-xs border border-slate-200">
                  Reintentar
                </button>
              </div>
            </div>
          ) : reportes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="6" y="4" width="22" height="28" rx="3" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M12 12h10M12 16h10M12 20h6" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="31" cy="31" r="7" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
                  <path d="M29 31h4M31 29v4" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <p className="text-xs font-medium">Sin reportes generados</p>
                <p className="text-[10px]">Usa el formulario para generar el primer reporte</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  {["Nodo / Ubicación", "Fecha generación", "Periodo", "Resultado", "Generado por", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportes.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50/80 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                  >
                    {/* Nodo */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 truncate max-w-[160px]">
                        {r.ubicacion || r.mac}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">{r.mac}</p>
                    </td>

                    {/* Fecha creación */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(r.creado_en)}
                    </td>

                    {/* Fecha del reporte (periodo) */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDate(r.fecha)}
                    </td>

                    {/* Cumplimiento */}
                    <td className="px-4 py-3">
                      <StatusBadge cumple={r.cumple_nom} />
                    </td>

                    {/* Generado por */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {r.generado_por}
                    </td>

                    {/* Descargar */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDescargar(r)}
                        disabled={downloadingId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-buap-700 bg-buap-50 hover:bg-buap-100 border border-buap-200 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                        title="Descargar PDF"
                      >
                        {downloadingId === r.id ? (
                          <span className="w-3 h-3 rounded-full border-2 border-buap-300 border-t-buap-700 animate-spin" />
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M5.5 1v7M2.5 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M1 9.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && reportes.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-[10px] text-slate-400">
              {reportes.length} reporte{reportes.length !== 1 ? "s" : ""} en total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
