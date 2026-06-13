import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PARAMS, NOM_127_LIMITS, PARAM_COLORS, buildHistory } from "../constants";
import { fetchTelemetriaRango } from "../api";

// node colors... we can add more in case of more nodes
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

// Max data points shown on the X axis in the Overview charts
const OVERVIEW_POINTS = 10;

// Merge all nodes' history for a given param into a unified timeline.
// Agrupamos usando la cadena exacta de tiempo generada por el frontend.
function buildMultiNodeData(nodes, param, isRangeActive) {
  const timeMap = {};

  // 1. Recopilar todos los puntos de tiempo únicos de todos los nodos
  nodes.forEach((node, idx) => {
    if (!node.history?.[param]) return;
    node.history[param].forEach((point) => {
      // Si el rango está activo, usamos fullLabel para agrupar (evita colisiones multi-día).
      // Si no, usamos la hora (point.time) tradicional.
      const bucketKey = isRangeActive ? point.fullLabel : point.time;
      if (!timeMap[bucketKey]) {
        timeMap[bucketKey] = {
          _ts: point.timestamp,
          time: isRangeActive ? `${point.date} ${point.time.substring(0, 5)}` : point.time,
          fullLabelKey: point.fullLabel
        };
      }
    });
  });

  // 2. Ordenar cronológicamente todos los buckets de tiempo
  const sortedBuckets = Object.values(timeMap).sort((a, b) => a._ts - b._ts);

  // 3. Para cada nodo, recorrer la línea de tiempo y propagar el último valor conocido
  nodes.forEach((node, idx) => {
    if (!node.history?.[param]) return;

    // Mapear los valores reales que sí existen para este nodo por su tiempo
    const nodeValsByTime = {};
    node.history[param].forEach((point) => {
      const key = isRangeActive ? point.fullLabel : point.time;
      nodeValsByTime[key] = point.value;
    });

    // Iniciar con la primera muestra disponible del nodo para evitar huecos iniciales
    let lastKnownVal = node.history[param].length > 0 ? node.history[param][0].value : undefined;

    sortedBuckets.forEach((bucket) => {
      const lookupKey = isRangeActive ? bucket.fullLabelKey : bucket.time;
      const currentVal = nodeValsByTime[lookupKey];
      if (currentVal !== undefined) {
        lastKnownVal = currentVal;
      }
      
      // Asignar el último valor conocido para garantizar la continuidad lineal en la gráfica
      if (lastKnownVal !== undefined) {
        bucket[`node_${idx}`] = lastKnownVal;
      }
    });
  });

  // Retornar los últimos OVERVIEW_POINTS buckets ordenados, o todos si hay rango activo
  return isRangeActive ? sortedBuckets : sortedBuckets.slice(-OVERVIEW_POINTS);
}

const CustomTooltip = ({ active, payload, label, nodes, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs min-w-[280px]">
      <p className="text-slate-400 font-medium mb-1.5 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((entry, i) => {
        const nodeIdx = parseInt(entry.dataKey.replace("node_", ""), 10);
        const node = nodes[nodeIdx];
        const label = node?.ubicacion || node?.node_id || `Nodo ${nodeIdx + 1}`;
        return (
          <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-slate-600 truncate max-w-[200px]">{label}</span>
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

function MultiNodeParamCard({ param, nodes, globalAlerts, onResolveAlert, canResolve, onExpand }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const limits = NOM_127_LIMITS[param];
  const paramColor = PARAM_COLORS[param];

  const activeNodes = nodes.filter((n) => n.history?.[param]);
  const data = buildMultiNodeData(activeNodes, param, false);
  const chartData = isMounted ? data : [];

  // Check if any node has an out-of-range value for this param
  const hasAlert = globalAlerts?.some((a) => a.parametro === param);

  const yVals = data.flatMap((d) =>
    activeNodes.map((_, idx) => d[`node_${idx}`]).filter((v) => v !== undefined)
  );
  const yMin = yVals.length ? Math.min(...yVals) * 0.95 : 0;
  const yMax = yVals.length ? Math.max(...yVals) * 1.05 : 10;

  return (
    <div
      className={`card p-5 cursor-pointer hover:shadow-card-md transition-shadow duration-200 group relative flex flex-col h-full border overflow-y-auto custom-scrollbar ${
        hasAlert ? "border-red-200" : "border-slate-100"
      }`}
      onClick={() => onExpand?.(param)}
      title="Clic para ver comparación detallada de historial"
    >
      {/* Expand/compare hint */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 bg-buap-50 border border-buap-100 rounded-lg px-2 py-1 shadow-sm">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-buap-500">
            <path d="M1 10L10 1M10 1H5M10 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold text-buap-600">Comparar</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: paramColor }} />
          <div>
            <p className="text-sm font-bold text-buap-900 leading-tight">{limits.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
            </p>
          </div>
        </div>
        {hasAlert && (
          <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md flex-shrink-0 group-hover:opacity-0 transition-opacity">
            ⚠ Alerta
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 25 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="5 5" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
              tickLine={false}
              interval="preserveStartEnd"
              height={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#cbd5e1", fontSize: 9 }}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(2)}
              width={38}
            />
            <Tooltip
              content={
                <CustomTooltip nodes={activeNodes} unit={limits.unit || ""} />
              }
            />
            {limits.max < 9999 && (
              <ReferenceLine y={limits.max} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {limits.min > 0 && (
              <ReferenceLine y={limits.min} stroke="#fcd34d" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {activeNodes.map((node, idx) => (
              <Line
                key={node.id}
                type="monotone"
                dataKey={`node_${idx}`}
                name={node.ubicacion || node.node_id}
                stroke={NODE_PALETTE[idx % NODE_PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: NODE_PALETTE[idx % NODE_PALETTE.length], stroke: "#fff", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Overview({ nodes, globalAlerts, onResolveAlert, canResolve, onSelectNode, onExpandParam, activeParams = [], onOpenAlerts }) {
  const nodesWithHistory = nodes.filter((n) => n.history);

  return (
    <div className="flex-1 w-full flex flex-col gap-5 overflow-y-auto lg:overflow-hidden min-h-0 relative">

      {/* Param cards grid */}
      <div className={`flex-1 flex flex-col pr-2 pb-4 lg:h-full lg:min-h-0 min-h-0 relative ${
        activeParams.length <= 4
          ? "lg:overflow-hidden"
          : "overflow-y-auto scrollbar-none"
      }`}>
        {nodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
              </svg>
              <p className="text-sm">No hay nodos registrados para mostrar métricas conjuntas.</p>
            </div>
          </div>
        ) : nodesWithHistory.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
            <div className="flex flex-col items-center gap-4 max-w-xs text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="8" width="24" height="18" rx="3" stroke="#94a3b8" strokeWidth="1.5" />
                  <path d="M10 14h12M10 19h7" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="24" cy="8" r="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
                  <path d="M22.5 8h3M24 6.5v3" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Sin datos disponibles
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ninguno de los nodos registrados ha enviado registros de telemetría. Se mostrarán las métricas en cuando haya datos disponibles.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in h-full auto-rows-[240px] lg:auto-rows-[calc((100%-1.25rem)/2)]">
            {activeParams.map((param) => {
              return (
                <div key={param} className="h-full">
                  <MultiNodeParamCard
                    param={param}
                    nodes={nodesWithHistory}
                    globalAlerts={globalAlerts}
                    onResolveAlert={onResolveAlert}
                    canResolve={canResolve}
                    onExpand={onExpandParam}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
