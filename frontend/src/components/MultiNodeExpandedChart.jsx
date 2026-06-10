import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { NOM_127_LIMITS, PARAM_COLORS, buildHistory } from "../constants";
import { fetchTelemetria, fetchTelemetriaRango } from "../api";
import ScrollTimePicker from "./common/ScrollTimePicker";

const NODE_PALETTE = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#0ea5e9", // sky
  "#f97316", // orange
  "#14b8a6", // teal
  "#a3e635", // lime
];

const CustomTooltip = ({ active, payload, nodeNames, unit }) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-card-md text-xs min-w-[160px]">
      <p className="text-slate-400 font-medium mb-1.5 border-b border-slate-100 pb-1">
        {pt.fullLabel ?? pt.time}
      </p>
      {payload.map((entry, i) => {
        const nodeIdx = parseInt(entry.dataKey.replace("node_", ""), 10);
        const name = nodeNames[nodeIdx] || `Nodo ${nodeIdx + 1}`;
        return (
          <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-slate-600 truncate max-w-[120px]" title={name}>{name}</span>
            </div>
            <span className="font-mono font-semibold text-buap-800">
              {entry.value !== undefined ? Number(entry.value).toFixed(2) : "—"}
              <span className="font-normal text-slate-400 ml-0.5">{unit}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

// unir el historial de multiples nodos en una unica linea del tiempo
function mergeHistories(nodesHistories, param, isRangeActive) {
  const timeMap = {};

  // recolectar todos los puntos de todos los nodos en el tiempo 
  nodesHistories.forEach(({ history }) => {
    history.forEach((point) => {
      const bucketKey = isRangeActive ? point.fullLabel : point.time;
      if (!timeMap[bucketKey]) {
        timeMap[bucketKey] = {
          _ts: point.timestamp,
          time: isRangeActive ? `${point.date} ${point.time.substring(0, 5)}` : point.time,
          fullLabel: point.fullLabel || point.time
        };
      }
    });
  });

  // ordenar cronologicamente
  const sortedBuckets = Object.values(timeMap).sort((a, b) => a._ts - b._ts);

  // propagtar valores para cada nodo
  nodesHistories.forEach(({ history }, idx) => {
    const valsByTime = {};
    history.forEach((point) => {
      const bucketKey = isRangeActive ? point.fullLabel : point.time;
      valsByTime[bucketKey] = point.value;
    });

    let lastKnownVal = history.length > 0 ? history[0].value : undefined;

    sortedBuckets.forEach((bucket) => {
      const bucketKey = isRangeActive ? bucket.fullLabel : bucket.time;
      const currentVal = valsByTime[bucketKey];
      if (currentVal !== undefined) {
        lastKnownVal = currentVal;
      }
      if (lastKnownVal !== undefined) {
        bucket[`node_${idx}`] = lastKnownVal;
      }
    });
  });

  return sortedBuckets;
}

export default function MultiNodeExpandedChart({ param, nodes, onClose }) {
  const limits = NOM_127_LIMITS[param];
  const paramColor = PARAM_COLORS[param];

  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Range Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getNowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const [rangeDates, setRangeDates] = useState({
    desdeFecha: "",
    desdeHora: getNowTime(),
    hastaFecha: "",
    hastaHora: getNowTime(),
  });
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [customResults, setCustomResults] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState("");

  // filtrar nodos no activos/disponibles
  const activeNodes = useMemo(() => {
    return nodes.filter((n) => !n.sinDatos && n.history?.[param] && n.history[param].length > 0);
  }, [nodes, param]);

  const handleApplyRange = async (e) => {
    e?.stopPropagation();
    if (!rangeDates.desdeFecha || !rangeDates.desdeHora || !rangeDates.hastaFecha || !rangeDates.hastaHora || activeNodes.length === 0) return;

    const desdeDate = new Date(`${rangeDates.desdeFecha}T${rangeDates.desdeHora}`);
    const hastaDate = new Date(`${rangeDates.hastaFecha}T${rangeDates.hastaHora}`);

    if (desdeDate >= hastaDate) {
      setRangeError("La fecha y hora 'Desde' debe ser anterior a 'Hasta'.");
      return;
    }

    setRangeLoading(true);
    setRangeError("");
    try {
      const results = await Promise.all(
        activeNodes.map(async (node) => {
          try {
            const telemetry = await fetchTelemetriaRango(node.id, desdeDate.toISOString(), hastaDate.toISOString());
            const historyObj = buildHistory(telemetry);
            const history = historyObj[param] || [];
            return { node, history };
          } catch (err) {
            console.error(`Error al cargar rango para nodo [${node.id}]:`, err.message);
            return { node, history: [] };
          }
        })
      );
      setCustomResults(results.filter((r) => r.history.length > 0));
      setIsRangeActive(true);
      setShowDatePicker(false);
    } catch (err) {
      setRangeError(err.message || "Error al cargar datos de rango.");
    } finally {
      setRangeLoading(false);
    }
  };

  const handleResetRange = (e) => {
    e?.stopPropagation();
    setCustomResults(null);
    setIsRangeActive(false);
    const now = new Date();
    const currentHrMn = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setRangeDates({
      desdeFecha: "",
      desdeHora: currentHrMn,
      hastaFecha: "",
      hastaHora: currentHrMn,
    });
    setShowDatePicker(false);
    setRangeError("");
  };

  const resultsWithData = useMemo(() => {
    if (isRangeActive && customResults !== null) {
      return customResults;
    }
    return activeNodes.map((node) => {
      // slice the last 10 points for the comparative chart
      const history = (node.history?.[param] || []).slice(-10);
      return { node, history };
    }).filter((r) => r.history.length > 0);
  }, [activeNodes, param, isRangeActive, customResults]);

  const chartData = useMemo(() => {
    return mergeHistories(resultsWithData, param, isRangeActive);
  }, [resultsWithData, param, isRangeActive]);

  const nodeStats = useMemo(() => {
    return resultsWithData.map(({ node, history }, idx) => {
      const values = history.map((h) => h.value);
      const current = values[values.length - 1];
      const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const outOfNorm = values.filter((v) => v < limits.min || v > limits.max).length;

      return {
        id: node.id,
        name: node.ubicacion || node.node_id,
        color: NODE_PALETTE[idx % NODE_PALETTE.length],
        current,
        avg,
        min,
        max,
        outOfNorm
      };
    });
  }, [resultsWithData, limits]);

  const error = resultsWithData.length === 0
    ? "No se encontraron muestras de telemetría en el rango seleccionado."
    : "";

  const loading = false;

  // cerrar con escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // eje y
  const allYVals = chartData.flatMap((d) =>
    nodeStats.map((_, idx) => d[`node_${idx}`]).filter((v) => v !== undefined)
  );
  const yMin = allYVals.length ? Math.min(...allYVals) * 0.95 : 0;
  const yMax = allYVals.length ? Math.max(...allYVals) * 1.05 : 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-card-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <span className="w-3 h-3 rounded-full" style={{ background: paramColor }} />
              <h2 className="text-lg font-bold text-buap-900 tracking-tight">
                Comparativa: {limits.label}
              </h2>
              <span className="chip bg-slate-100 text-slate-500 border-slate-200 text-[11px]">
                {isRangeActive ? "Rango Personalizado" : "Últimas 10 muestras por nodo"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {loading || rangeLoading ? "Cargando datos..." : `Comparando ${nodeStats.length} nodos activos`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Calendar Selector */}
            <div className="relative z-30" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
                  isRangeActive
                    ? "bg-amber-50 border-amber-200 text-amber-600 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:text-buap-700 hover:bg-slate-100"
                }`}
                title="Seleccionar rango de fechas"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{isRangeActive ? "Filtro Activo" : "Filtrar por Rango"}</span>
              </button>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 w-68 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3 animate-fade-in text-left">
                  <p className="text-[11px] font-bold text-buap-900 border-b border-slate-100 pb-1.5">
                    Rango de tiempo
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Desde:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={rangeDates.desdeFecha}
                        onChange={(e) => setRangeDates(r => ({ ...r, desdeFecha: e.target.value }))}
                        className="input-base h-8.5 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50/50 flex-1"
                      />
                      <ScrollTimePicker
                        value={rangeDates.desdeHora}
                        onChange={(val) => setRangeDates(r => ({ ...r, desdeHora: val }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Hasta:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={rangeDates.hastaFecha}
                        onChange={(e) => setRangeDates(r => ({ ...r, hastaFecha: e.target.value }))}
                        className="input-base h-8.5 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50/50 flex-1"
                      />
                      <ScrollTimePicker
                        value={rangeDates.hastaHora}
                        onChange={(val) => setRangeDates(r => ({ ...r, hastaHora: val }))}
                      />
                    </div>
                  </div>

                  {rangeError && (
                    <p className="text-[9px] text-red-500 font-medium">{rangeError}</p>
                  )}

                  <div className="flex gap-1.5 mt-1">
                    {isRangeActive && (
                      <button
                        type="button"
                        onClick={handleResetRange}
                        className="btn-ghost flex-1 justify-center py-1 text-[10px] text-slate-500 border border-slate-200"
                      >
                        Limpiar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyRange}
                      disabled={rangeLoading || !rangeDates.desdeFecha || !rangeDates.desdeHora || !rangeDates.hastaFecha || !rangeDates.hastaHora}
                      className="btn-primary flex-1 justify-center py-1 text-[10px] font-semibold"
                    >
                      {rangeLoading ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                      ) : (
                        "Aceptar"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              disabled={loading || rangeLoading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* area de contenido */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 min-h-0 gap-6">
          {/* carga y sincronizacion */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-buap-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Cargando y sincronizando historiales…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-20">
              <p className="text-red-500 font-medium bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* tabla de comparacion */}
              <div className="w-full overflow-x-auto overflow-y-hidden border border-slate-100 rounded-2xl flex-shrink-0">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nodo</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">Lectura Actual</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">
                        {isRangeActive ? "Promedio (Rango)" : "Promedio (10m)"}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">Mínimo</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">Máximo</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">
                        {isRangeActive ? "Fuera de Norma" : "Fuera de Norma (10m)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nodeStats.map((stat) => {
                      const isOut = stat.current < limits.min || stat.current > limits.max;
                      return (
                        <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stat.color }} />
                            <span className="text-xs font-bold text-buap-900 truncate max-w-[180px]">{stat.name}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`font-mono text-xs font-bold ${isOut ? "text-red-500" : "text-buap-900"}`}>
                              {stat.current !== undefined ? stat.current.toFixed(2) : "—"}
                              <span className="font-normal text-slate-400 ml-0.5 text-[10px]">{limits.unit}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600">
                            {stat.avg !== undefined ? stat.avg.toFixed(2) : "—"}
                            <span className="font-normal text-slate-400 ml-0.5 text-[10px]">{limits.unit}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600">
                            {stat.min !== undefined ? stat.min.toFixed(2) : "—"}
                            <span className="font-normal text-slate-400 ml-0.5 text-[10px]">{limits.unit}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600">
                            {stat.max !== undefined ? stat.max.toFixed(2) : "—"}
                            <span className="font-normal text-slate-400 ml-0.5 text-[10px]">{limits.unit}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {stat.outOfNorm > 0 ? (
                              <span className="chip-danger text-[10px] py-0.5 px-2">
                                {isRangeActive ? `${stat.outOfNorm} muestras` : `${stat.outOfNorm} / 10`}
                              </span>
                            ) : (
                              <span className="chip-success text-[10px] py-0.5 px-2">
                                {isRangeActive ? "0 muestras" : "0 / 10"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* contenedor de grafica*/}
              <div className="flex-shrink-0 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-medium">
                  <p>Normativa NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-5 h-px border-t border-dashed border-red-300" />
                      Límite Máximo
                    </span>
                    {limits.min > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-5 h-px border-t border-dashed border-amber-300" />
                        Límite Mínimo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-[250px] w-full">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
                        tickLine={false}
                        interval={isRangeActive ? Math.ceil(chartData.length / 10) : undefined}
                      />
                      <YAxis
                        domain={[yMin, yMax]}
                        tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
                        tickLine={false}
                        tickFormatter={(val) => val.toFixed(2)}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            nodeNames={nodeStats.map((s) => s.name)}
                            unit={limits.unit}
                          />
                        }
                      />
                      {limits.max < 9999 && (
                        <ReferenceLine y={limits.max} stroke="#fca5a5" strokeDasharray="5 5" strokeWidth={1.5} />
                      )}
                      {limits.min > 0 && (
                        <ReferenceLine y={limits.min} stroke="#fcd34d" strokeDasharray="5 5" strokeWidth={1.5} />
                      )}
                      {nodeStats.map((stat, idx) => (
                        <Line
                          key={stat.id}
                          type="monotone"
                          dataKey={`node_${idx}`}
                          stroke={stat.color}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: stat.color, stroke: "#fff", strokeWidth: 2 }}
                          connectNulls
                          isAnimationActive={!hasAnimated}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
