const OK = "#4f7f5b";
const WATCH = "#a07a1e";
const BAD = "#9c463c";

// Coordenadas ilustrativas de nodos sobre un esquema del campus (no es el mapa real de NodeMap.jsx).
const NODES = [
  [14, 22], [33, 15], [52, 28], [71, 18], [86, 33],
  [22, 52], [41, 62], [58, 48], [77, 58], [90, 72],
  [30, 80], [48, 86], [66, 76], [85, 88],
].map(([x, y], i) => ({ x, y, label: `Nodo BEB-${String(i + 1).padStart(2, "0")}`, color: i === 6 ? WATCH : OK }));

export default function CampusMiniMap() {
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide">Mapa de nodos · CU</span>
        <span className="text-[11px] text-black/55 tabular-nums">13 en línea · 1 en observación</span>
      </div>
      <div
        className="relative border border-black/15 h-[130px]"
        style={{
          backgroundImage:
            "linear-gradient(#00000014 1px,transparent 1px),linear-gradient(90deg,#00000014 1px,transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      >
        {NODES.map((n) => (
          <span
            key={n.label}
            title={n.label}
            className="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full"
            style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color, boxShadow: `0 0 0 3px ${n.color}38` }}
          />
        ))}
        <span className="absolute left-2 bottom-1.5 text-[10px] uppercase tracking-wide text-black/45">Esquema del campus</span>
      </div>
      <div className="flex gap-4 flex-wrap mt-3 text-[11px] uppercase tracking-wide text-black/60">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: OK }} />Óptimo</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: WATCH }} />En observación</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: BAD }} />Fuera de norma</span>
      </div>
    </div>
  );
}
