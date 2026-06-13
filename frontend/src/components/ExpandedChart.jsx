import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { NOM_127_LIMITS, PARAM_COLORS, buildHistory } from "../constants";
import { fetchTelemetria, fetchTelemetriaRango } from "../api";
import ScrollTimePicker from "./common/ScrollTimePicker";

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

export default function ExpandedChart({ param, nodeId, nodeName, latestTimestamp, onClose, disabled, umbrales }) {
  const limits = (umbrales && umbrales[param])
    ? {
        min: umbrales[param].valor_min,
        max: umbrales[param].valor_max,
        unit: NOM_127_LIMITS[param].unit,
        label: NOM_127_LIMITS[param].label
      }
    : NOM_127_LIMITS[param];
  const color = disabled ? "#94a3b8" : PARAM_COLORS[param];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const [customHistory, setCustomHistory] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState("");

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

  const handleApplyRange = async (e) => {
    e?.stopPropagation();
    if (!rangeDates.desdeFecha || !rangeDates.desdeHora || !rangeDates.hastaFecha || !rangeDates.hastaHora || !nodeId) return;

    const desdeDate = new Date(`${rangeDates.desdeFecha}T${rangeDates.desdeHora}`);
    const hastaDate = new Date(`${rangeDates.hastaFecha}T${rangeDates.hastaHora}`);

    if (desdeDate >= hastaDate) {
      setRangeError("La fecha y hora 'Desde' debe ser anterior a 'Hasta'.");
      return;
    }

    setRangeLoading(true);
    setRangeError("");
    try {
      const telemetry = await fetchTelemetriaRango(nodeId, desdeDate.toISOString(), hastaDate.toISOString());
      const historyObj = buildHistory(telemetry);
      const points = (historyObj[param] || []).map((pt) => ({
        ...pt,
        time: `${pt.date} ${pt.time.substring(0, 5)}`
      }));
      setCustomHistory(points);
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
    setCustomHistory(null);
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

  const activeHistory = isRangeActive && customHistory !== null ? customHistory : data;

  const outOfRange = activeHistory.filter((d) => d.value < limits.min || d.value > limits.max).length;
  const avg = activeHistory.length ? (activeHistory.reduce((s, d) => s + d.value, 0) / activeHistory.length).toFixed(2) : "—";
  const minV = activeHistory.length ? Math.min(...activeHistory.map((d) => d.value)).toFixed(2) : "—";
  const maxV = activeHistory.length ? Math.max(...activeHistory.map((d) => d.value)).toFixed(2) : "—";

  const yMin = activeHistory.length ? Math.min(...activeHistory.map((d) => d.value)) * 0.93 : 0;
  const yMax = activeHistory.length ? Math.max(...activeHistory.map((d) => d.value)) * 1.07 : 10;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Thin out labels if many points
  const tickInterval = activeHistory.length > 48 ? Math.floor(activeHistory.length / 12) : activeHistory.length > 24 ? 3 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-card-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <h2 className="text-lg font-bold text-buap-900 tracking-tight">
                {limits.label}
              </h2>
              <span className="chip bg-slate-100 text-slate-500 border-slate-200 text-[11px]">
                {isRangeActive ? "Rango Personalizado" : "Últimas 30 muestras"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {nodeName} · {loading || rangeLoading ? "Cargando..." : `${activeHistory.length} muestras registradas`}
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

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-100 flex-shrink-0">
          {[
            { label: "Promedio", value: avg, unit: limits.unit || "pH" },
            { label: "Mínimo", value: minV, unit: limits.unit || "pH" },
            { label: "Máximo", value: maxV, unit: limits.unit || "pH" },
            { label: "Fuera de norma", value: outOfRange, unit: "muestras", warn: outOfRange > 0 },
          ].map(({ label, value, unit, warn }) => (
            <div key={label} className="bg-white px-6 py-3 relative">
              <p className="label-sm text-[10px] mb-0.5">{label}</p>
              {loading || rangeLoading ? (
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
          {(loading || rangeLoading) && (
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
            <AreaChart data={activeHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${param}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
                tickLine={false}
                interval={tickInterval}
                angle={activeHistory.length > 24 ? -30 : 0}
                textAnchor={activeHistory.length > 24 ? "end" : "middle"}
                height={activeHistory.length > 24 ? 40 : 20}
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
