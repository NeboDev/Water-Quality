import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { NOM_127_LIMITS, PARAM_COLORS, buildHistory } from "../constants";
import { fetchTelemetriaRango } from "../api";
import CardCorners from "./common/CardCorners";

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-300 px-3 py-2 text-xs">
      <p className="text-slate-400 font-medium mb-0.5">{payload[0].payload.time}</p>
      <p className="font-semibold text-kanan-900 text-sm">
        {payload[0].value}{" "}
        <span className="font-normal text-slate-400 text-xs">{unit}</span>
      </p>
    </div>
  );
};

export default function ParameterCard({ param, history, currentValue, onExpand, disabled, umbrales, onRegisterSample }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const limits = (umbrales && umbrales[param])
    ? {
        min: umbrales[param].valor_min,
        max: umbrales[param].valor_max,
        unit: NOM_127_LIMITS[param].unit,
        label: NOM_127_LIMITS[param].label
      }
    : NOM_127_LIMITS[param];
  const color = disabled ? "#94a3b8" : PARAM_COLORS[param]; // Slate-400 if disabled
  const isOut = disabled ? false : (currentValue < limits.min || currentValue > limits.max);

  // Calcular los límites basándose en todo el historial para evitar saltos en el eje Y
  const yMin = history.length ? Math.min(...history.map((d) => d.value)) * 0.95 : 0;
  const yMax = history.length ? Math.max(...history.map((d) => d.value)) * 1.05 : 10;

  // Renderizar sin datos en el primer frame para detonar la animación de Recharts
  const chartData = isMounted ? history : [];

  return (
    <div
      className={`card-hover p-5 cursor-pointer group flex flex-col h-full overflow-y-auto custom-scrollbar ${isOut ? "border-status-alert bg-status-alert/5" : ""
        }`}
      onClick={onExpand}
      title="Clic para ver historial completo"
    >
      <CardCorners color={isOut ? "border-status-alert" : "border-slate-400"} />
      {/* Action buttons on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onRegisterSample?.(param)}
          className="flex items-center gap-1 bg-status-ok/10 hover:bg-status-ok/20 border border-status-ok/40 px-2 py-1 transition-colors"
          title="Guardar como Muestra Oficial ICUAP"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-status-ok">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="text-[9px] font-bold text-status-ok">Muestra</span>
        </button>

        <div
          onClick={onExpand}
          className="flex items-center gap-1 bg-kanan-100 hover:bg-kanan-200 border border-kanan-200 px-2 py-1 cursor-pointer transition-colors"
          title="Clic para ver historial completo"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-kanan-500">
            <path d="M1 10L10 1M10 1H5M10 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-bold text-kanan-600">Historial</span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <p className="label-sm">{limits.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold font-mono leading-none" style={{ color: isOut ? "#b03a2b" : color }}>
            {currentValue ?? "—"}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className="text-xs text-slate-400">{limits.unit || "pH"}</span>
            {isOut && <span className="chip-danger text-[10px] py-0.5 px-2">Fuera de norma</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[90px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 25 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
              tickLine={false}
              interval={5}
              height={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#cbd5e1", fontSize: 9 }}
              tickLine={false}
              tickFormatter={(val) => val.toFixed(2)}
              width={35}
            />
            <Tooltip content={<CustomTooltip unit={limits.unit} />} />
            {limits.max < 9999 && (
              <ReferenceLine y={limits.max} stroke="#b03a2b" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {limits.min > 0 && (
              <ReferenceLine y={limits.min} stroke="#c8901f" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
