import { NOM_127_LIMITS, PARAM_COLORS } from "../constants";

const PARAMS = ["ph", "turbidez", "conductividad", "temperatura", "tds"];

function ParamPill({ param, value }) {
  const limits = NOM_127_LIMITS[param];
  const color = PARAM_COLORS[param];
  const isOut = value < limits.min || value > limits.max;
  const pct = Math.min(100, Math.max(0, ((value - limits.min) / (limits.max - limits.min)) * 100));

  return (
    <div className={`flex-1 min-w-0 px-3 py-2 rounded-xl border transition-colors ${
      isOut ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
    }`}>
      <div className="flex items-baseline justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">
          {limits.label}
        </span>
        <span className="font-mono text-sm font-semibold flex-shrink-0" style={{ color: isOut ? "#dc2626" : color }}>
          {value}
          <span className="text-[9px] font-normal text-slate-400 ml-0.5">{limits.unit}</span>
        </span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: isOut ? "#dc2626" : color }}
        />
      </div>
    </div>
  );
}

export default function StatusBar({ node }) {
  if (!node) return null;
  const alertCount = PARAMS.filter((p) => {
    const v = node.valores[p];
    const l = NOM_127_LIMITS[p];
    return v < l.min || v > l.max;
  }).length;

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 min-w-[160px]">
          <p className="text-sm font-semibold text-buap-900 leading-none">{node.node_id}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{node.mac}</p>
          {alertCount > 0 && (
            <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                <path d="M5.5 1L10 9.5H1L5.5 1z" />
              </svg>
              {alertCount} fuera de norma
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-1 min-w-0">
          {PARAMS.map((p) => <ParamPill key={p} param={p} value={node.valores[p]} />)}
        </div>
      </div>
    </div>
  );
}
