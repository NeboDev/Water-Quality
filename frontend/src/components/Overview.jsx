import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PARAMS, NOM_127_LIMITS, PARAM_COLORS } from "../constants";

// Paleta de colores para los nodos (no los parámetros)
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

// Merge all nodes' history for a given param into a unified timeline
// Output: [{ time, node0_id: val, node1_id: val, ... }, ...]
function buildMultiNodeData(nodes, param) {
  // Collect all unique timestamps across all active nodes
  const timeMap = {}; // time -> { [nodeKey]: value }

  nodes.forEach((node, idx) => {
    if (!node.history?.[param]) return;
    const key = `node_${idx}`;
    node.history[param].forEach((point) => {
      if (!timeMap[point.time]) timeMap[point.time] = { time: point.time };
      timeMap[point.time][key] = point.value;
    });
  });

  return Object.values(timeMap).sort((a, b) =>
    a.time.localeCompare(b.time)
  );
}

const CustomTooltip = ({ active, payload, label, nodes, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs min-w-[140px]">
      <p className="text-slate-400 font-medium mb-1.5 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((entry, i) => {
        const nodeIdx = parseInt(entry.dataKey.replace("node_", ""), 10);
        const node = nodes[nodeIdx];
        const label = node?.ubicacion || node?.node_id || `Nodo ${nodeIdx + 1}`;
        return (
          <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-slate-600 truncate max-w-[90px]">{label}</span>
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

function MultiNodeParamCard({ param, nodes, globalAlerts, onResolveAlert, canResolve }) {
  const limits = NOM_127_LIMITS[param];
  const paramColor = PARAM_COLORS[param];

  const activeNodes = nodes.filter((n) => n.history?.[param]);
  const data = buildMultiNodeData(activeNodes, param);

  // Check if any node has an out-of-range value for this param
  const hasAlert = globalAlerts?.some((a) => a.parametro === param);

  const yVals = data.flatMap((d) =>
    activeNodes.map((_, idx) => d[`node_${idx}`]).filter((v) => v !== undefined)
  );
  const yMin = yVals.length ? Math.min(...yVals) * 0.95 : 0;
  const yMax = yVals.length ? Math.max(...yVals) * 1.05 : 10;

  return (
    <div className={`card p-5 flex flex-col h-full border ${hasAlert ? "border-red-200" : "border-slate-100"}`}>
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
          <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md flex-shrink-0">
            ⚠ Alerta
          </span>
        )}
      </div>

      {/* Node legend pills */}
      <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
        {activeNodes.map((node, idx) => (
          <span
            key={node.id}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NODE_PALETTE[idx % NODE_PALETTE.length] }} />
            {node.ubicacion || node.node_id}
          </span>
        ))}
        {activeNodes.length === 0 && (
          <span className="text-[10px] text-slate-400 italic">Sin datos de telemetría</span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
              tickLine={false}
              interval="preserveStartEnd"
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
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Overview({ nodes, globalAlerts, onResolveAlert, canResolve, onSelectNode }) {
  const nodesWithHistory = nodes.filter((n) => n.history);

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">

      {/* Param cards grid */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[minmax(0,1fr)]">
          {PARAMS.filter(p => p !== 'conductividad').map((param) => (
            <MultiNodeParamCard
              key={param}
              param={param}
              nodes={nodesWithHistory}
              globalAlerts={globalAlerts}
              onResolveAlert={onResolveAlert}
              canResolve={canResolve}
            />
          ))}

          {/* Conductividad spans 2 columns */}
          <div className="lg:col-span-2 xl:col-span-2 h-full">
            <MultiNodeParamCard
              param="conductividad"
              nodes={nodesWithHistory}
              globalAlerts={globalAlerts}
              onResolveAlert={onResolveAlert}
              canResolve={canResolve}
            />
          </div>
        </div>
      </div>

      {/* Alertas Side Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-buap-900 flex items-center gap-2">
            Notificaciones
            {globalAlerts?.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </h2>
          <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
            {globalAlerts?.length || 0}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
          {globalAlerts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 text-center py-12">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs font-medium">Todo bajo control</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {globalAlerts.map((alerta) => {
                const limits = NOM_127_LIMITS[alerta.parametro];
                const color = PARAM_COLORS[alerta.parametro];
                const diff = alerta.valor_leido > alerta.valor_max
                  ? `+${(alerta.valor_leido - alerta.valor_max).toFixed(2)}`
                  : `-${(alerta.valor_min - alerta.valor_leido).toFixed(2)}`;
                const location = alerta.ubicacion || nodes?.find(n => n.id === alerta.nodo_id)?.ubicacion || "Nodo desconocido";

                return (
                  <div key={alerta.id} className="bg-white rounded-xl p-3 shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }} />
                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-xs font-bold text-buap-900 leading-none mb-1">
                            {limits?.label || alerta.parametro}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]" title={location}>
                            {location}
                          </p>
                        </div>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded">
                          {new Date(alerta.creado_en).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-end justify-between">
                        <p className="font-mono text-sm font-bold text-red-500 leading-none">
                          {alerta.valor_leido}
                          <span className="text-[9px] font-normal text-slate-400 ml-0.5">{limits?.unit || ""}</span>
                        </p>
                        <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          {diff} {limits?.unit}
                        </span>
                      </div>

                      {canResolve && (
                        <div className="mt-3 pt-2 border-t border-slate-100 text-right">
                          <button
                            onClick={() => onResolveAlert(alerta.id)}
                            className="text-[10px] font-bold text-buap-600 hover:text-buap-800 transition-colors"
                          >
                            Marcar resuelta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
