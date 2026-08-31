import { ResponsiveContainer, LineChart, Line, ReferenceArea, ReferenceLine, YAxis } from "recharts";

// Serie ilustrativa de pH en las últimas 12h — vista de referencia con datos de ejemplo.
const DATA = [
  { t: 0, ph: 7.1 }, { t: 1, ph: 7.2 }, { t: 2, ph: 7.05 }, { t: 3, ph: 7.25 },
  { t: 4, ph: 7.12 }, { t: 5, ph: 7.3 }, { t: 6, ph: 7.15 }, { t: 7, ph: 7.35 },
  { t: 8, ph: 7.2 }, { t: 9, ph: 7.32 }, { t: 10, ph: 7.22 }, { t: 11, ph: 7.4 },
];

export default function PhSparkline() {
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide">pH · últimas 12 h</span>
        <span className="text-[11px] text-black/55">rango norma 6.5 – 8.5</span>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={DATA} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <YAxis domain={[6.5, 8.5]} hide />
          <ReferenceArea y1={6.8} y2={7.6} fill="#eaf6ff" fillOpacity={1} />
          <ReferenceLine y={6.8} stroke="#38b6ff" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={7.6} stroke="#38b6ff" strokeDasharray="4 4" strokeWidth={1} />
          <Line type="monotone" dataKey="ph" stroke="#004aad" strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-[11px] text-black/55 mt-1.5">
        <span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
      </div>
    </div>
  );
}
