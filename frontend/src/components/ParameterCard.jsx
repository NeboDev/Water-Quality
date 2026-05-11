import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { NOM_127_LIMITS, PARAM_COLORS } from "../constants";

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-card-md text-xs">
      <p className="text-slate-400 font-medium mb-0.5">{payload[0].payload.time}</p>
      <p className="font-semibold text-buap-900 text-sm">
        {payload[0].value}{" "}
        <span className="font-normal text-slate-400 text-xs">{unit}</span>
      </p>
    </div>
  );
};

export default function ParameterCard({ param, history, currentValue, onExpand, disabled }) {
  const limits = NOM_127_LIMITS[param];
  const color  = disabled ? "#94a3b8" : PARAM_COLORS[param]; // Slate-400 if disabled
  const isOut  = disabled ? false : (currentValue < limits.min || currentValue > limits.max);
  const yMin   = history.length ? Math.min(...history.map((d) => d.value)) * 0.95 : 0;
  const yMax   = history.length ? Math.max(...history.map((d) => d.value)) * 1.05 : 10;

  return (
    <div
      className={`card-hover p-5 cursor-pointer group relative flex flex-col h-full ${
        isOut ? "border-red-300 bg-red-50/30" : ""
      }`}
      onClick={onExpand}
      title="Clic para ver historial completo"
    >
      {/* Expand hint */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 bg-buap-50 border border-buap-100 rounded-lg px-2 py-1">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-buap-500">
            <path d="M1 10L10 1M10 1H5M10 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold text-buap-600">Historial</span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="label-sm">{limits.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            NOM-127: {limits.min} – {limits.max} {limits.unit || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono leading-none" style={{ color: isOut ? "#dc2626" : color }}>
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
          <LineChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#cbd5e1", fontSize: 9, fontFamily: "DM Sans" }}
            tickLine={false}
            interval={5}
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
            <ReferenceLine y={limits.max} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          {limits.min > 0 && (
            <ReferenceLine y={limits.min} stroke="#fcd34d" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
