import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { NOM_127_LIMITS, PARAM_COLORS, buildHistory } from "../constants";
import { fetchTelemetria } from "../api";

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-card-md text-xs">
      <p className="text-slate-400 font-medium mb-1">{pt.fullLabel ?? pt.time}</p>
      <p className="font-bold text-buap-900 text-sm">
        {payload[0].value}{" "}
        <span className="font-normal text-slate-400 text-xs">{unit}</span>
      </p>
    </div>
  );
};

export default function ExpandedChart({ param, nodeId, nodeName, latestTimestamp, onClose, disabled }) {
  const limits = NOM_127_LIMITS[param];
  const color = disabled ? "#94a3b8" : PARAM_COLORS[param];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const rawTelemetry = await fetchTelemetria(nodeId, 30);
        if (!active) return;

        const historyObj = buildHistory(rawTelemetry);
        setData(historyObj[param] || []);
      } catch (err) {
        if (active) setError(err.message || "Error al cargar historial.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();

    return () => { active = false; };
  }, [nodeId, param]);

  const outOfRange = data.filter((d) => d.value < limits.min || d.value > limits.max).length;
  const avg = data.length ? (data.reduce((s, d) => s + d.value, 0) / data.length).toFixed(2) : "—";
  const minV = data.length ? Math.min(...data.map((d) => d.value)).toFixed(2) : "—";
  const maxV = data.length ? Math.max(...data.map((d) => d.value)).toFixed(2) : "—";

  const yMin = data.length ? Math.min(...data.map((d) => d.value)) * 0.93 : 0;
  const yMax = data.length ? Math.max(...data.map((d) => d.value)) * 1.07 : 10;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Thin out labels if many points
  const tickInterval = data.length > 48 ? Math.floor(data.length / 12) : data.length > 24 ? 3 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-card-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <h2 className="text-lg font-bold text-buap-900 tracking-tight">
                {limits.label}
              </h2>
              <span className="chip bg-slate-100 text-slate-500 border-slate-200 text-[11px]">
                Últimas 30 muestras
              </span>
            </div>
            <p className="text-xs text-slate-400">{nodeName} · {loading ? "Cargando..." : `${data.length} muestras registradas`}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
          {[
            { label: "Promedio", value: avg, unit: limits.unit || "pH" },
            { label: "Mínimo", value: minV, unit: limits.unit || "pH" },
            { label: "Máximo", value: maxV, unit: limits.unit || "pH" },
            { label: "Fuera de norma", value: outOfRange, unit: "muestras", warn: outOfRange > 0 },
          ].map(({ label, value, unit, warn }) => (
            <div key={label} className="bg-white px-6 py-3 relative">
              <p className="label-sm text-[10px] mb-0.5">{label}</p>
              {loading ? (
                <div className="h-7 bg-slate-100 rounded w-16 animate-pulse mt-1"></div>
              ) : (
                <p className={`font-mono text-xl font-bold ${warn ? "text-red-500" : "text-buap-900"}`}>
                  {value}
                  <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 px-6 py-5 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-buap-600 rounded-full animate-spin" />
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p className="text-red-500 font-medium bg-red-50 px-4 py-2 rounded-xl">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-medium">
              NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px border-t border-dashed border-red-300" />
                Límite máximo
              </span>
              {limits.min > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 h-px border-t border-dashed border-amber-300" />
                  Límite mínimo
                </span>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${param}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="fullLabel"
                tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
                tickLine={false}
                interval={tickInterval}
                angle={data.length > 24 ? -30 : 0}
                textAnchor={data.length > 24 ? "end" : "middle"}
                height={data.length > 24 ? 40 : 20}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip unit={limits.unit} />} />
              {limits.max < 9999 && (
                <ReferenceLine y={limits.max} stroke="#fca5a5" strokeDasharray="5 5" strokeWidth={1.5} />
              )}
              {limits.min > 0 && (
                <ReferenceLine y={limits.min} stroke="#fcd34d" strokeDasharray="5 5" strokeWidth={1.5} />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${param})`}
                dot={false}
                activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
