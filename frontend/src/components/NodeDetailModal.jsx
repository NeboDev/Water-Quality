import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { PARAMS, NOM_127_LIMITS, PARAM_COLORS, buildHistory, telemetryToPoint, computeNodeStatus, NODE_STATUS_META } from "../constants";
import { fetchTelemetria, fetchAlertas, fetchMuestras } from "../api";
import CardCorners from "./common/CardCorners";

const HISTORY_TABS = [
  ["lecturas", "Lecturas recientes"],
  ["alertas", "Alertas"],
  ["muestras", "Muestras oficiales"],
];

function BlockSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
      <div className="w-7 h-7 rounded-full border-2 border-kanan-200 border-t-kanan-700 animate-spin-slow" />
      {message && <p className="text-xs font-medium">{message}</p>}
    </div>
  );
}

function BlockError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-status-alert">
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="7" x2="11" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="15.5" r="1.2" fill="currentColor" />
      </svg>
      <p className="text-xs text-slate-500 font-medium">{message || "No se pudo cargar la información."}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-kanan-600 hover:text-kanan-800 mt-1">
          Reintentar
        </button>
      )}
    </div>
  );
}

function BlockEmpty({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white border border-slate-300 px-3 py-2 text-xs">
      <p className="text-slate-400 font-medium mb-1">{pt.fullLabel ?? pt.time}</p>
      <p className="font-bold text-kanan-900 text-sm">
        {payload[0].value} <span className="font-normal text-slate-400 text-xs">{unit}</span>
      </p>
    </div>
  );
};

export default function NodeDetailModal({ node, onClose, canRecordSamples, onRegisterSample }) {
  // Recalcula "en línea" → "sin señal" por vencimiento mientras el modal sigue abierto
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  const liveStatus = computeNodeStatus(node, now);
  const meta = NODE_STATUS_META[liveStatus];

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Gráfico por parámetro ──────────────────────────────
  const [selectedParam, setSelectedParam] = useState(
    () => PARAMS.find((p) => node.valores?.[p] != null) || PARAMS[0]
  );
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [chartReload, setChartReload] = useState(0);

  useEffect(() => {
    let active = true;
    setChartLoading(true);
    setChartError("");
    fetchTelemetria(node.id, 30)
      .then((raw) => {
        if (!active) return;
        const hist = buildHistory(raw);
        setChartData(hist[selectedParam] || []);
      })
      .catch((err) => { if (active) setChartError(err.message || "Error al cargar el historial."); })
      .finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [node.id, selectedParam, chartReload]);

  // Cuando llega telemetría nueva de este nodo (socket), se antepone el punto sin refetch.
  const lastAppendedTs = useRef(node.timestamp);
  useEffect(() => {
    if (!node.timestamp || node.timestamp === lastAppendedTs.current) return;
    lastAppendedTs.current = node.timestamp;
    if (node.valores?.[selectedParam] == null) return;
    const pt = telemetryToPoint({ timestamp: node.timestamp, valores: node.valores }, selectedParam);
    setChartData((prev) => (prev.length ? [...prev, pt] : prev));
  }, [node.timestamp, node.valores, selectedParam]);

  const limits = node.umbrales?.[selectedParam]
    ? {
        min: node.umbrales[selectedParam].valor_min,
        max: node.umbrales[selectedParam].valor_max,
        unit: NOM_127_LIMITS[selectedParam].unit,
        label: NOM_127_LIMITS[selectedParam].label,
      }
    : NOM_127_LIMITS[selectedParam];
  const color = PARAM_COLORS[selectedParam];
  const yMin = chartData.length ? Math.min(...chartData.map((d) => d.value)) * 0.93 : 0;
  const yMax = chartData.length ? Math.max(...chartData.map((d) => d.value)) * 1.07 : 10;

  // ── Bloque de historial (lecturas / alertas / muestras) ──
  const [historyTab, setHistoryTab] = useState("lecturas");
  const [blocks, setBlocks] = useState({
    lecturas: { data: null, loading: false, error: "" },
    alertas: { data: null, loading: false, error: "" },
    muestras: { data: null, loading: false, error: "" },
  });

  const loadBlock = useCallback(async (key) => {
    setBlocks((b) => ({ ...b, [key]: { ...b[key], loading: true, error: "" } }));
    try {
      let data;
      if (key === "lecturas") data = await fetchTelemetria(node.id, 20);
      else if (key === "alertas") data = await fetchAlertas({ nodo_id: node.id });
      else data = await fetchMuestras({ nodo_id: node.id, limit: 10 });
      setBlocks((b) => ({ ...b, [key]: { data, loading: false, error: "" } }));
    } catch (err) {
      setBlocks((b) => ({ ...b, [key]: { data: null, loading: false, error: err.message || "Error al cargar." } }));
    }
  }, [node.id]);

  useEffect(() => {
    const b = blocks[historyTab];
    if (!b.data && !b.loading && !b.error) loadBlock(historyTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyTab]);

  // Refresca alertas cuando el estado del nodo cambia (alertas:nueva / alertas:resuelta ya
  // recalculan node.status en App.jsx) — solo si esa pestaña ya se cargó una vez.
  const prevStatusRef = useRef(node.status);
  useEffect(() => {
    if (prevStatusRef.current !== node.status) {
      prevStatusRef.current = node.status;
      if (blocks.alertas.data) loadBlock("alertas");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.status]);

  // Antepone la lectura nueva a la lista de "lecturas recientes" si ya está cargada.
  const lastReadingTs = useRef(node.timestamp);
  useEffect(() => {
    if (!node.timestamp || node.timestamp === lastReadingTs.current) return;
    lastReadingTs.current = node.timestamp;
    setBlocks((b) => {
      if (!b.lecturas.data) return b;
      const nuevaLectura = { timestamp: node.timestamp, valores: node.valores };
      return { ...b, lecturas: { ...b.lecturas, data: [nuevaLectura, ...b.lecturas.data].slice(0, 20) } };
    });
  }, [node.timestamp, node.valores]);

  const currentBlock = blocks[historyTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white border border-slate-300 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <CardCorners color={liveStatus === "alert" ? "border-status-alert" : "border-slate-400"} />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-slate-300 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <span
                className={`w-3 h-3 rounded-full flex-shrink-0 ${liveStatus === "live" || liveStatus === "alert" ? "animate-pulse-dot" : ""}`}
                style={{ background: meta.dot }}
              />
              <h2 className="text-lg font-bold text-kanan-900 tracking-tight truncate">{node.ubicacion || node.node_id}</h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 flex-shrink-0 ${
                  liveStatus === "alert" ? "bg-status-alert/10 text-status-alert" :
                  liveStatus === "live" ? "bg-status-ok/10 text-status-ok" :
                  "bg-slate-100 text-slate-500"
                }`}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {node.node_id} · {node.mac} · fw {node.version_firmware}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canRecordSamples && (
              <button
                type="button"
                onClick={() => onRegisterSample(node)}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                Registrar muestra
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ── Gráfico ── */}
          <div className="px-7 py-5 border-b border-slate-300">
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {PARAMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedParam(p)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    selectedParam === p
                      ? "bg-kanan-700 border-kanan-700 text-white"
                      : "bg-white border-slate-300 text-slate-500 hover:text-kanan-700 hover:border-kanan-400"
                  }`}
                >
                  {NOM_127_LIMITS[p].label}
                </button>
              ))}
            </div>

            <div className="relative min-h-[260px]">
              {chartLoading ? (
                <BlockSpinner message="Cargando historial…" />
              ) : chartError ? (
                <BlockError message={chartError} onRetry={() => setChartReload((n) => n + 1)} />
              ) : chartData.length === 0 ? (
                <BlockEmpty message="Este nodo aún no tiene lecturas registradas para este parámetro." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-xs text-slate-400 font-medium">
                      NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-5 h-px border-t border-dashed border-status-alert" />
                        Límite máximo
                      </span>
                      {limits.min > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-5 h-px border-t border-dashed border-status-warn" />
                          Límite mínimo
                        </span>
                      )}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-modal-${selectedParam}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[yMin, yMax]} tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} width={40} />
                      <Tooltip content={<CustomTooltip unit={limits.unit} />} />
                      {limits.max < 9999 && <ReferenceLine y={limits.max} stroke="#b03a2b" strokeDasharray="5 5" strokeWidth={1.5} />}
                      {limits.min > 0 && <ReferenceLine y={limits.min} stroke="#c8901f" strokeDasharray="5 5" strokeWidth={1.5} />}
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#grad-modal-${selectedParam})`}
                        dot={false}
                        activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* ── Historial ── */}
          <div className="px-7 py-5">
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {HISTORY_TABS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setHistoryTab(key)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    historyTab === key
                      ? "bg-kanan-100 border-kanan-300 text-kanan-800"
                      : "bg-white border-slate-300 text-slate-500 hover:text-kanan-700 hover:border-kanan-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-[160px]">
              {currentBlock.loading ? (
                <BlockSpinner message="Cargando…" />
              ) : currentBlock.error ? (
                <BlockError message={currentBlock.error} onRetry={() => loadBlock(historyTab)} />
              ) : !currentBlock.data || currentBlock.data.length === 0 ? (
                <BlockEmpty
                  message={
                    historyTab === "lecturas" ? "Sin lecturas registradas para este nodo." :
                    historyTab === "alertas" ? "Sin alertas registradas para este nodo." :
                    "Sin muestras oficiales registradas para este nodo."
                  }
                />
              ) : historyTab === "lecturas" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="py-2 pr-3 font-semibold">Fecha</th>
                        {PARAMS.map((p) => (
                          <th key={p} className="py-2 pr-3 font-semibold">{NOM_127_LIMITS[p].label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentBlock.data.map((r, i) => (
                        <tr key={r._id || r.timestamp || i}>
                          <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                            {new Date(r.timestamp).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          {PARAMS.map((p) => {
                            const limitsP = node.umbrales?.[p]
                              ? { min: node.umbrales[p].valor_min, max: node.umbrales[p].valor_max }
                              : NOM_127_LIMITS[p];
                            const v = r.valores?.[p];
                            const out = v !== undefined && v !== null && (v < limitsP.min || v > limitsP.max);
                            return (
                              <td key={p} className={`py-2 pr-3 font-mono whitespace-nowrap ${out ? "text-status-alert font-semibold" : "text-slate-700"}`}>
                                {v ?? "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : historyTab === "alertas" ? (
                <div className="flex flex-col gap-2">
                  {currentBlock.data.map((a) => {
                    const l = NOM_127_LIMITS[a.parametro];
                    const c = PARAM_COLORS[a.parametro];
                    return (
                      <div key={a.id} className={`flex items-center justify-between gap-3 border px-3 py-2.5 ${a.resuelta ? "border-slate-200 bg-slate-50" : "border-status-alert/40 bg-status-alert/5"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                          <span className="text-sm font-semibold text-kanan-900">{l?.label || a.parametro}</span>
                          <span className="text-xs text-slate-500 font-mono">{a.valor_leido} {l?.unit}</span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {new Date(a.creado_en).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 flex-shrink-0 ${a.resuelta ? "bg-status-ok/10 text-status-ok" : "bg-status-alert/10 text-status-alert"}`}>
                          {a.resuelta ? "Resuelta" : "Pendiente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentBlock.data.map((m) => (
                    <div key={m._id} className="border border-slate-200 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-kanan-900">
                          {new Date(m.timestamp).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[10px] text-slate-400">{m.registrado_por}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] font-mono text-slate-600">
                        {PARAMS.map((p) => (
                          <span key={p}>{NOM_127_LIMITS[p].label}: {m.valores?.[p] ?? "—"}</span>
                        ))}
                      </div>
                      {m.nota && <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{m.nota}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
