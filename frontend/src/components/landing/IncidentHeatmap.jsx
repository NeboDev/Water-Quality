import { useMemo, useState } from "react";
import HeatMap from "@uiw/react-heat-map";

// ── Geometría compartida con @uiw/react-heat-map (ver node_modules/@uiw/react-heat-map/esm/SVG.js) ──
// leftPad = 28 cuando hay weekLabels, topPad = 20 cuando hay monthLabels arriba.
// Cada celda ocupa (RECT_SIZE + SPACE) px, columna idx -> x = LEFT_PAD + idx*(RECT_SIZE+SPACE).
// Reproducimos esa aritmética para que la franja de resumen semanal (que la librería no ofrece)
// quede alineada pixel a pixel debajo de la cuadrícula real.
const RECT_SIZE = 14;
const SPACE = 4;
const LEFT_PAD = 28;
const TOP_PAD = 20;
const COL_STEP = RECT_SIZE + SPACE;
const WEEKS = 18;

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const NODOS = ["BEB-02 · Ing. Química", "BEB-05 · Biblioteca Central", "BEB-07 · Ingeniería", "BEB-11 · CCU", "BEB-14 · Medicina"];

const NIVELES = [
  { nombre: "Sin incidencias", color: "#cbd5e1", desc: "Todos los parámetros dentro de norma durante el día." },
  { nombre: "Incidencia leve", color: "#9fd9ff", desc: "Una lectura al borde del límite; se normalizó sin intervención." },
  { nombre: "Incidencia moderada", color: "#d97706", desc: "Parámetro fuera de rango por más de 30 min; se avisó al personal." },
  { nombre: "Incidencia crítica", color: "#dc2626", desc: "Fuera de norma sostenido o varias alertas acumuladas en el día." },
];

function formatFecha(date) {
  return `${DIAS[date.getDay()]} ${date.getDate()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLibDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// PRNG determinista (mismo LCG que el mockup) para que la demo sea estable entre renders.
function makeRng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function useIncidentData() {
  return useMemo(() => {
    const rnd = makeRng(20260420);
    // Ancla la grilla en un domingo, igual que getStartOfWeek() de la librería,
    // para que nuestro cálculo de columnas/filas coincida exactamente con el suyo.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mostRecentSunday = new Date(today);
    mostRecentSunday.setDate(today.getDate() - today.getDay());
    const startDate = new Date(mostRecentSunday);
    startDate.setDate(startDate.getDate() - (WEEKS - 1) * 7);
    const endDate = new Date(mostRecentSunday);
    endDate.setDate(endDate.getDate() + 6);

    const value = [];
    const detailByDate = {};
    const weekMax = Array(WEEKS).fill(0);

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const r = rnd();
        const level = r > 0.965 ? 3 : r > 0.9 ? 2 : r > 0.74 ? 1 : 0;
        weekMax[w] = Math.max(weekMax[w], level);
        const date = new Date(startDate);
        date.setDate(date.getDate() + w * 7 + d);
        const key = toLibDate(date);
        const nodo = NODOS[Math.floor(r * 1000) % NODOS.length];
        value.push({ date: key, count: level });
        detailByDate[key] = {
          title: `${formatFecha(date)} — ${NIVELES[level].nombre}`,
          detail: level === 0 ? NIVELES[0].desc : `${NIVELES[level].desc} Nodo ${nodo}.`,
        };
      }
    }

    return { value, detailByDate, weekMax, startDate, endDate };
  }, []);
}

function CellTooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="fixed z-[70] max-w-[280px] pointer-events-none border border-black bg-white px-3 py-2.5 shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      <div className="font-semibold text-[13px] uppercase tracking-wide leading-tight">{tip.title}</div>
      <p className="text-xs leading-snug mt-1.5 text-black/75">{tip.detail}</p>
    </div>
  );
}

export default function IncidentHeatmap() {
  const { value, detailByDate, weekMax, startDate, endDate } = useIncidentData();
  const [tip, setTip] = useState(null);

  const panelColors = { 0: NIVELES[0].color, 1: NIVELES[1].color, 2: NIVELES[2].color, 3: NIVELES[3].color };
  const gridWidth = LEFT_PAD + WEEKS * COL_STEP;
  const gridHeight = TOP_PAD + 7 * COL_STEP + 4;

  return (
    <div className="grid gap-6 sm:gap-10 md:grid-cols-[1fr_auto] items-start">
      <div className="min-w-0">
        <div className="overflow-x-auto pb-0.5">
          <div style={{ width: gridWidth, minWidth: gridWidth }}>
            <HeatMap
              value={value}
              startDate={startDate}
              endDate={endDate}
              width={gridWidth}
              height={gridHeight}
              rectSize={RECT_SIZE}
              space={SPACE}
              legendCellSize={0}
              weekLabels={["", "Lun", "", "Mié", "", "Vie", ""]}
              monthLabels={MESES}
              panelColors={panelColors}
              style={{ color: "rgba(0,0,0,0.5)" }}
              rectProps={{ rx: 0 }}
              rectRender={(props, data) => {
                const info = detailByDate[data.date];
                // @uiw/react-heat-map resuelve panelColors con un off-by-one cuando las claves son
                // enteros consecutivos pequeños (existColor() usa `>` en vez de `>=`): un conteo que
                // coincide exactamente con un umbral que no es el más alto salta al color del
                // siguiente nivel. Con niveles discretos 0-3 esto pasa siempre, así que fijamos el
                // fill nosotros mismos en vez de confiar en el cálculo interno.
                const fill = panelColors[data.count] ?? props.fill;
                if (!info) return <rect {...props} fill={fill} />;
                return (
                  <rect
                    {...props}
                    fill={fill}
                    tabIndex={0}
                    style={{ cursor: "pointer", outlineOffset: 2 }}
                    onMouseEnter={(e) => setTip({ title: info.title, detail: info.detail, x: e.clientX + 14, y: e.clientY + 16 })}
                    onMouseMove={(e) => setTip((prev) => (prev ? { ...prev, x: e.clientX + 14, y: e.clientY + 16 } : prev))}
                    onMouseLeave={() => setTip(null)}
                    onFocus={(e) => {
                      const r = e.target.getBoundingClientRect();
                      setTip({ title: info.title, detail: info.detail, x: r.right + 10, y: r.top });
                    }}
                    onBlur={() => setTip(null)}
                  />
                );
              }}
            />

            {/* Franja de resumen semanal: el nivel más alto ocurrido esa semana. No forma parte de
                @uiw/react-heat-map — se dibuja aparte, alineada con el mismo LEFT_PAD/COL_STEP. */}
            <div
              className="flex gap-1 border-t border-black/15 pt-2 mt-2.5"
              style={{ paddingLeft: LEFT_PAD, width: gridWidth }}
            >
              {weekMax.map((level, w) => (
                <span
                  key={w}
                  title={NIVELES[level].nombre}
                  className="h-[5px]"
                  style={{ width: RECT_SIZE, background: NIVELES[level].color }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs leading-relaxed mt-4 max-w-[56ch] text-black/65">
          Cada cuadro es un día; la franja inferior resume la semana con el nivel más alto que sí ocurrió. Pasa el cursor sobre un día para ver el detalle.
        </p>
      </div>

      <div className="min-w-0 md:border-l md:border-black/15 md:pl-6 lg:pl-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-black/70 mb-3.5">Niveles</div>
        <div className="space-y-3.5">
          {NIVELES.map((n) => (
            <div key={n.nombre} className="flex gap-2.5">
              <span className="w-3.5 h-3.5 flex-none mt-0.5" style={{ background: n.color }} />
              <div className="min-w-0">
                <div className="font-semibold text-sm uppercase tracking-wide leading-tight">{n.nombre}</div>
                <p className="text-xs leading-snug mt-1 text-black/70 max-w-[32ch]">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CellTooltip tip={tip} />
    </div>
  );
}
