import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PARAMS, NOM_127_LIMITS, PARAM_COLORS, buildHistory, timeAgo } from "../constants";
import { fetchTelemetriaRango, fetchTelemetriaLive, fetchAlertas } from "../api";
import CardCorners from "../components/common/CardCorners";

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
    <div className="bg-white border border-slate-300 px-3 py-2 text-xs min-w-[280px]">
      <p className="text-slate-400 font-medium mb-1.5 border-b border-slate-200 pb-1">{label}</p>
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
            <span className="font-mono font-semibold text-kanan-800">
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
      className={`card p-5 cursor-pointer transition-colors duration-200 group flex flex-col h-full overflow-y-auto custom-scrollbar ${
        hasAlert ? "border-status-alert" : ""
      }`}
      onClick={() => onExpand?.(param)}
      title="Clic para ver comparación detallada de historial"
    >
      <CardCorners color={hasAlert ? "border-status-alert" : "border-slate-400"} />
      {/* Expand/compare hint */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 bg-kanan-100 border border-kanan-200 px-2 py-1">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-kanan-500">
            <path d="M1 10L10 1M10 1H5M10 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold text-kanan-600">Comparar</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: paramColor }} />
          <div>
            <p className="text-sm font-bold text-kanan-900 leading-tight">{limits.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
            </p>
          </div>
        </div>
        {hasAlert && (
          <span className="text-[10px] font-bold bg-status-alert/10 text-status-alert border border-status-alert/40 px-2 py-0.5 flex-shrink-0 group-hover:opacity-0 transition-opacity">
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
              <ReferenceLine y={limits.max} stroke="#b03a2b" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {limits.min > 0 && (
              <ReferenceLine y={limits.min} stroke="#c8901f" strokeDasharray="4 4" strokeWidth={1.5} />
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

// ── helpers ──────────────────────────────────────────────────

const DAY_LABELS = ["L", "", "M", "", "J", "", "S"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEK_OPTIONS = [8, 12, 16];

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// Agrupa las alertas por día para construir la cuadrícula tipo heatmap (últimas `weeks` semanas).
function buildHeatmapDays(alerts, weeks, nodeFilter) {
  const filtered = nodeFilter === "all" ? alerts : alerts.filter((a) => a.nodo_id === nodeFilter);

  const byDay = {};
  filtered.forEach((a) => {
    if (!a.creado_en) return;
    const key = dayKey(new Date(a.creado_en));
    if (!byDay[key]) byDay[key] = { count: 0, params: new Set() };
    byDay[key].count += 1;
    byDay[key].params.add(a.parametro);
  });

  const totalDays = weeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));
  const offset = (start.getDay() + 6) % 7; // alinear a lunes
  start.setDate(start.getDate() - offset);

  const totalCells = totalDays + offset;
  const days = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const future = d > today;
    const key = dayKey(d);
    const entry = byDay[key];
    days.push({
      date: d,
      key,
      future,
      count: future ? 0 : entry?.count || 0,
      params: entry ? [...entry.params] : [],
    });
  }
  return days;
}

function heatColor(count) {
  if (count === 0) return "#e2e8f0";
  if (count <= 2) return "#e8c86a";
  if (count <= 5) return "#d98634";
  return "#b03a2b";
}

function fmtDay(d) {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// ── small state components ──────────────────────────────────

function BlockSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-kanan-200 border-t-kanan-700 animate-spin-slow" />
      {message && <p className="text-xs font-medium">{message}</p>}
    </div>
  );
}

function BlockError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <svg width="24" height="24" viewBox="0 0 22 22" fill="none" className="text-status-alert">
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
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

// ── KPI row ──────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = "text-kanan-900", children }) {
  return (
    <div className="card p-5 flex flex-col">
      <CardCorners />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className={`flex items-baseline gap-2 mt-2.5 font-mono ${accent}`}>
        <span className="text-2xl font-bold leading-tight break-words">{value}</span>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-2 leading-snug">{sub}</p>}
      {children}
    </div>
  );
}

function KpiRow({ loading, error, onRetry, liveNodes, alerts }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <BlockSpinner />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-2">
        <BlockError message={error} onRetry={onRetry} />
      </div>
    );
  }

  const total = liveNodes.length;
  const online = liveNodes.filter((n) => n.status === "activo" && n.liveValores).length;
  const onlinePct = total ? Math.round((online / total) * 100) : 0;

  const open = alerts.filter((a) => !a.resuelta);
  const resolved = alerts.filter((a) => a.resuelta);
  const openNodeCount = new Set(open.map((a) => a.nodo_id)).size;

  const paramTally = {};
  alerts.forEach((a) => { paramTally[a.parametro] = (paramTally[a.parametro] || 0) + 1; });
  const topParamEntry = Object.entries(paramTally).sort((a, b) => b[1] - a[1])[0];
  const topParam = topParamEntry ? NOM_127_LIMITS[topParamEntry[0]]?.label || topParamEntry[0] : "—";
  const topParamColor = topParamEntry ? PARAM_COLORS[topParamEntry[0]] : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Nodos en línea" value={`${online}/${total}`} sub={`${onlinePct}% reportando datos`}>
        <div className="h-1.5 mt-3 bg-slate-100 overflow-hidden">
          <div className="h-full bg-status-ok transition-all" style={{ width: `${onlinePct}%` }} />
        </div>
      </KpiCard>

      <KpiCard
        label="Alertas sin resolver"
        value={open.length}
        accent={open.length > 0 ? "text-status-alert" : "text-kanan-900"}
        sub={open.length > 0 ? `en ${openNodeCount} nodo${openNodeCount !== 1 ? "s" : ""}` : "todo dentro de norma"}
      />

      <KpiCard
        label="Alertas resueltas"
        value={resolved.length}
        accent="text-status-ok"
        sub={`de ${alerts.length} registradas en total`}
      />

      <KpiCard label="Parámetro más incidente" value={topParam} sub={topParamEntry ? `${topParamEntry[1]} alerta${topParamEntry[1] !== 1 ? "s" : ""} registrada${topParamEntry[1] !== 1 ? "s" : ""}` : "sin incidencias"}>
        {topParamColor && (
          <span className="inline-block w-2.5 h-2.5 rounded-full mt-2.5" style={{ background: topParamColor }} />
        )}
      </KpiCard>
    </div>
  );
}

// ── Heatmap ──────────────────────────────────────────────────

function AlertHeatmap({ loading, error, onRetry, alerts, nodes }) {
  const [weeks, setWeeks] = useState(8);
  const [nodeFilter, setNodeFilter] = useState("all");
  const [tip, setTip] = useState(null); // { x, y, day }

  const days = useMemo(
    () => (loading || error ? [] : buildHeatmapDays(alerts, weeks, nodeFilter)),
    [alerts, weeks, nodeFilter, loading, error]
  );
  const cols = Math.max(1, Math.ceil(days.length / 7));

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastCol = -3;
    for (let w = 0; w < cols; w++) {
      const d = days[w * 7]?.date;
      if (!d) { labels.push(""); continue; }
      const prev = w > 0 ? days[(w - 1) * 7]?.date.getMonth() : -1;
      const isNew = d.getMonth() !== prev && w - lastCol >= 3;
      if (isNew) lastCol = w;
      labels.push(isNew ? MONTHS_SHORT[d.getMonth()] : "");
    }
    return labels;
  }, [days, cols]);

  const totalInPeriod = days.reduce((s, d) => s + d.count, 0);
  const criticalDays = days.filter((d) => d.count >= 6).length;

  const nodeOptions = [{ id: "all", ubicacion: "Todos los nodos" }, ...nodes];

  return (
    <div className="card p-5 sm:p-6">
      <CardCorners />
      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-bold text-kanan-900">Densidad de alertas por día</h2>
          <p className="text-xs text-slate-400 mt-1">
            {loading ? "Calculando…" : error ? "—" : `${totalInPeriod} alerta${totalInPeriod !== 1 ? "s" : ""} en el periodo · ${criticalDays} día${criticalDays !== 1 ? "s" : ""} crítico${criticalDays !== 1 ? "s" : ""} (6+)`}
          </p>
        </div>

        {!loading && !error && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 px-2.5 py-1.5 text-slate-600 outline-none focus:border-kanan-600 max-w-[180px]"
            >
              {nodeOptions.map((n) => (
                <option key={n.id} value={n.id}>{n.ubicacion || n.node_id}</option>
              ))}
            </select>
            <div className="flex items-center border border-slate-300">
              {WEEK_OPTIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    weeks === w ? "bg-kanan-700 text-white" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {w} sem.
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <BlockSpinner message="Cargando alertas…" />
      ) : error ? (
        <BlockError message={error} onRetry={onRetry} />
      ) : days.length === 0 ? (
        <BlockEmpty message="No hay alertas registradas para este filtro." />
      ) : (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 items-start w-fit mx-auto">
              {/* Day-of-week labels */}
              <div
                className="grid flex-none pt-4"
                style={{ gridTemplateRows: "repeat(7,1fr)", gap: "3px" }}
              >
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={i}
                    className="flex items-center justify-end text-[9px] uppercase tracking-wide text-slate-400 w-3 h-[10px] sm:w-3.5 sm:h-[13px] md:h-[15px]"
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div>
                {/* Month labels */}
                <div
                  className="grid mb-1"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: "3px" }}
                >
                  {monthLabels.map((m, i) => (
                    <span key={i} className="text-[9px] uppercase tracking-wide text-slate-400 whitespace-nowrap w-[10px] sm:w-[13px] md:w-[15px] overflow-visible">
                      {m}
                    </span>
                  ))}
                </div>

                {/* Cells */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
                    gridTemplateRows: "repeat(7, auto)",
                    gridAutoFlow: "column",
                    gap: "3px",
                  }}
                >
                  {days.map((d, i) => (
                    <span
                      key={i}
                      onMouseEnter={(e) => !d.future && setTip({ x: e.clientX, y: e.clientY, day: d })}
                      onMouseMove={(e) => setTip((prev) => (prev && !d.future ? { ...prev, x: e.clientX, y: e.clientY } : prev))}
                      onMouseLeave={() => setTip(null)}
                      className={`block w-[10px] h-[10px] sm:w-[13px] sm:h-[13px] md:w-[15px] md:h-[15px] ${
                        d.future ? "" : "cursor-pointer"
                      }`}
                      style={{ background: d.future ? "transparent" : heatColor(d.count) }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-200 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Menos</span>
              {[0, 1, 4, 8].map((c) => (
                <span key={c} className="w-3 h-3" style={{ background: heatColor(c) }} />
              ))}
              <span>Más</span>
            </div>
            <span className="ml-auto">Umbrales NOM-127-SSA1-2021</span>
          </div>

          {tip && (
            <div
              className="fixed z-50 pointer-events-none bg-black text-white px-3 py-2 text-xs shadow-tooltip min-w-[160px]"
              style={{ left: Math.max(8, tip.x + 14), top: Math.max(8, tip.y - 60) }}
            >
              <p className="font-semibold">{fmtDay(tip.day.date)}</p>
              <p className="mt-0.5 text-white/80">
                {tip.day.count === 0 ? "Sin alertas" : `${tip.day.count} alerta${tip.day.count !== 1 ? "s" : ""}`}
              </p>
              {tip.day.params.length > 0 && (
                <p className="mt-0.5 text-white/60">
                  {tip.day.params.map((p) => NOM_127_LIMITS[p]?.label || p).join(", ")}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Alertas recientes ────────────────────────────────────────

function RecentAlerts({ loading, error, onRetry, alerts, canResolve, onResolve, onOpenAlerts }) {
  const recent = [...alerts]
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    .slice(0, 6);
  const openCount = alerts.filter((a) => !a.resuelta).length;

  return (
    <div className="card p-5 h-full flex flex-col">
      <CardCorners />
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-kanan-900">Alertas recientes</h2>
        {!loading && !error && (
          <button onClick={() => onOpenAlerts?.()} className="text-xs font-semibold text-kanan-600 hover:text-kanan-800 whitespace-nowrap">
            Ver todas ({openCount}) →
          </button>
        )}
      </div>

      {loading ? (
        <BlockSpinner message="Cargando alertas…" />
      ) : error ? (
        <BlockError message={error} onRetry={onRetry} />
      ) : recent.length === 0 ? (
        <BlockEmpty message="No hay alertas registradas." />
      ) : (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto custom-scrollbar">
          {recent.map((a) => {
            const limits = NOM_127_LIMITS[a.parametro];
            const color = PARAM_COLORS[a.parametro];
            return (
              <div key={a.id} className={`border p-3 ${a.resuelta ? "border-slate-200 bg-slate-50" : "border-status-alert/40 bg-status-alert/5"}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-semibold text-kanan-900">{limits?.label || a.parametro}</span>
                    <span className="text-xs text-slate-500 font-mono">{a.valor_leido} {limits?.unit}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 flex-shrink-0 ${
                    a.resuelta ? "bg-status-ok/10 text-status-ok" : "bg-status-alert/10 text-status-alert"
                  }`}>
                    {a.resuelta ? "Resuelta" : "Pendiente"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <p className="text-xs text-slate-400 truncate">
                    {a.ubicacion || "Nodo desconocido"} · {new Date(a.creado_en).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {!a.resuelta && canResolve && (
                    <button onClick={() => onResolve(a.id)} className="text-[11px] font-semibold text-kanan-600 hover:text-kanan-800 flex-shrink-0">
                      Marcar resuelta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && !canResolve && recent.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          Tu rol permite consultar la información; la resolución de alertas la realizan operadores, ICUAP o administración.
        </p>
      )}
    </div>
  );
}

// ── Estado de nodos ──────────────────────────────────────────

function nodeDotColor(status, hasData) {
  if (status === "alerta") return "#b03a2b";
  if (status === "inactivo") return "#9a9a9c";
  if (!hasData) return "#9a9a9c";
  return "#4f7f5b";
}

function NodeStatusGrid({ liveNodes, onSelectNode }) {
  if (liveNodes.length === 0) {
    return <BlockEmpty message="No hay nodos registrados." />;
  }

  return (
    <div className="card p-5 h-full flex flex-col">
      <CardCorners />
      <h2 className="text-base font-bold text-kanan-900 mb-4">Estado de nodos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto custom-scrollbar">
        {liveNodes.map((n) => {
          const hasData = !!n.liveValores;
          const dot = nodeDotColor(n.status, hasData);
          const isOnline = n.status !== "inactivo" && n.status !== "alerta" && hasData;
          return (
            <button
              key={n.id}
              onClick={() => onSelectNode?.(n)}
              className="text-left border border-slate-200 hover:border-kanan-400 hover:bg-kanan-100/40 transition-colors p-3"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${isOnline ? "animate-pulse-dot" : ""}`}
                  style={{ background: dot }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{n.ubicacion || n.node_id}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{n.node_id}</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] font-mono text-slate-400">
                    <span>{n.status === "inactivo" ? "deshabilitado" : hasData ? "en línea" : "sin señal"}</span>
                    <span>{timeAgo(n.liveTimestamp)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#4f7f5b" }} />Óptimo</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#b03a2b" }} />Alerta activa</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#9a9a9c" }} />Sin señal</span>
      </div>
    </div>
  );
}

// ── Overview principal ───────────────────────────────────────

export default function Overview({ nodes, globalAlerts, onResolveAlert, canResolve, onSelectNode, onExpandParam, activeParams = [], onOpenAlerts }) {
  const nodesWithHistory = nodes.filter((n) => n.history);

  // Snapshot en vivo dedicado (GET /telemetria/live) para la vista principal.
  const [liveMap, setLiveMap] = useState({});
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError("");
    try {
      const data = await fetchTelemetriaLive();
      const map = {};
      data.forEach((entry) => { map[entry.nodo_id] = entry.ultima_lectura; });
      setLiveMap(map);
    } catch (err) {
      setLiveError(err.message || "No se pudo cargar la telemetría en vivo.");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => { loadLive(); }, [loadLive]);

  // Historial completo de alertas (GET /alertas, sin filtro) para el heatmap, KPIs y lista reciente.
  const [allAlerts, setAllAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError("");
    try {
      const data = await fetchAlertas();
      setAllAlerts(data);
    } catch (err) {
      setAlertsError(err.message || "No se pudieron cargar las alertas.");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  // Nuevas alertas que llegan por WebSocket (telemetria:live → alertas:nueva, ya integrado en App)
  // se propagan aquí vía `globalAlerts`; las incorporamos sin duplicar ni volver a pedir el endpoint.
  useEffect(() => {
    if (!globalAlerts?.length) return;
    setAllAlerts((prev) => {
      const known = new Set(prev.map((a) => a.id));
      const nuevas = globalAlerts.filter((a) => !known.has(a.id));
      return nuevas.length ? [...nuevas, ...prev] : prev;
    });
  }, [globalAlerts]);

  const handleResolve = async (id) => {
    try {
      await onResolveAlert(id);
      setAllAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resuelta: true } : a)));
    } catch (err) {
      console.error(err);
    }
  };

  // Nodos enriquecidos con la lectura en vivo dedicada (fallback a lo que ya trae `nodes` por prop).
  const liveNodes = nodes.map((n) => ({
    ...n,
    liveValores: liveMap[n.id]?.valores ?? n.valores ?? null,
    liveTimestamp: liveMap[n.id]?.timestamp ?? n.timestamp ?? null,
  }));

  return (
    <div className="flex-1 w-full flex flex-col gap-5 overflow-y-auto min-h-0 relative pr-1">

      {/* KPIs */}
      <KpiRow
        loading={liveLoading || alertsLoading}
        error={liveError || alertsError}
        onRetry={() => { loadLive(); loadAlerts(); }}
        liveNodes={liveNodes}
        alerts={allAlerts}
      />

      {/* Heatmap de incidencias */}
      <AlertHeatmap
        loading={alertsLoading}
        error={alertsError}
        onRetry={loadAlerts}
        alerts={allAlerts}
        nodes={nodes}
      />

      {/* Alertas recientes + Estado de nodos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <RecentAlerts
          loading={alertsLoading}
          error={alertsError}
          onRetry={loadAlerts}
          alerts={allAlerts}
          canResolve={canResolve}
          onResolve={handleResolve}
          onOpenAlerts={onOpenAlerts}
        />
        <NodeStatusGrid liveNodes={liveNodes} onSelectNode={onSelectNode} />
      </div>

      {/* Series históricas por parámetro */}
      <div className="flex flex-col min-h-[280px]">
        <h2 className="text-base font-bold text-kanan-900 mb-4">Tendencias por parámetro</h2>
        <div className="flex-1 pr-1 pb-2 relative">
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-white border border-slate-300 relative">
              <CardCorners />
              <div className="flex flex-col items-center gap-3 text-slate-400 py-10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
                </svg>
                <p className="text-sm">No hay nodos registrados para mostrar métricas conjuntas.</p>
              </div>
            </div>
          ) : nodesWithHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-white border border-slate-300 animate-fade-in relative">
              <CardCorners />
              <div className="flex flex-col items-center gap-4 max-w-xs text-center py-10">
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in auto-rows-[240px]">
              {activeParams.map((param) => (
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
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
