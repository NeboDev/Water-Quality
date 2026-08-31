import { useState, useEffect, useRef, useMemo } from "react";
import { PARAMS, NOM_127_LIMITS, timeAgo, computeNodeStatus, NODE_STATUS_META } from "../constants";
import CardCorners from "../components/common/CardCorners";

const STATUS_META = NODE_STATUS_META;

const FILTERS = [
  ["all", "Todos"],
  ["live", "En línea"],
  ["alert", "Alerta"],
  ["silent", "Sin señal"],
  ["off", "Inactivo"],
];

function paramChip(node, status, param) {
  const limits = node.umbrales?.[param]
    ? { min: node.umbrales[param].valor_min, max: node.umbrales[param].valor_max }
    : NOM_127_LIMITS[param];
  const { unit, label } = NOM_127_LIMITS[param];
  const value = node.valores?.[param];
  const has = value !== null && value !== undefined;
  const stale = status === "silent" || status === "off";
  const out = has && !stale && (value < limits.min || value > limits.max);
  return {
    label,
    value: has ? `${value}${unit ? " " + unit : ""}` : "—",
    tone: !has || stale ? "neutral" : out ? "alert" : "ok",
  };
}

const CHIP_TONE_CLASSES = {
  ok: "text-status-ok border-status-ok/40 bg-status-ok/10",
  alert: "text-status-alert border-status-alert/40 bg-status-alert/10",
  neutral: "text-slate-400 border-slate-300 bg-transparent",
};

function EmptyState({ message, onReset }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center gap-3">
      <CardCorners />
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-300">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
      </svg>
      <p className="text-sm text-slate-500">{message}</p>
      {onReset && (
        <button onClick={onReset} className="btn-ghost border border-slate-300 text-xs">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

function NodeCard({ item, flashing, onOpenNode }) {
  const { node, status, chips } = item;
  const meta = STATUS_META[status];
  const isFlashing = !!flashing[node.id];
  const pulsing = status === "live" || status === "alert";

  return (
    <button
      onClick={() => onOpenNode(node)}
      className={`card-hover relative text-left p-4 flex flex-col overflow-hidden transition-colors duration-300 ${
        isFlashing ? "border-kanan-500 bg-kanan-100/40" : status === "alert" ? "border-status-alert" : ""
      } ${status === "off" ? "opacity-60" : ""}`}
    >
      <CardCorners color={status === "alert" ? "border-status-alert" : isFlashing ? "border-kanan-500" : "border-slate-400"} />
      {isFlashing && (
        <span className="absolute left-0 top-0 h-0.5 w-full bg-kanan-600 origin-left animate-sweep" />
      )}

      <div className="flex items-start gap-2.5">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${pulsing ? "animate-pulse-dot" : ""}`}
          style={{ background: meta.dot }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-kanan-900 truncate">{node.ubicacion || node.node_id}</p>
          <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{node.node_id}</p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 flex-shrink-0 ${
            status === "alert"
              ? "bg-status-alert/10 text-status-alert"
              : status === "live"
              ? "bg-status-ok/10 text-status-ok"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {chips.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-baseline gap-1 px-1.5 py-0.5 text-[11px] border ${CHIP_TONE_CLASSES[c.tone]}`}
          >
            <span className="text-[9px] uppercase tracking-wide opacity-75">{c.label}</span>
            {c.value}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-200 text-[10px] text-slate-400">
        <span className="font-mono truncate">
          {node.mac} · fw {node.version_firmware}
        </span>
        <span className={`flex-shrink-0 ${isFlashing ? "text-kanan-700 font-semibold" : ""}`}>{timeAgo(node.timestamp)}</span>
      </div>
    </button>
  );
}

function GridView({ items, flashing, onOpenNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5 animate-fade-in">
      {items.map((item) => (
        <NodeCard key={item.node.id} item={item} flashing={flashing} onOpenNode={onOpenNode} />
      ))}
    </div>
  );
}

function TableView({ items, onOpenNode }) {
  return (
    <div className="overflow-x-auto border border-slate-300 bg-white animate-fade-in">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-300 text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2.5 font-semibold">Nodo</th>
            <th className="px-3 py-2.5 font-semibold">Estado</th>
            {PARAMS.map((p) => (
              <th key={p} className="px-3 py-2.5 font-semibold">
                {NOM_127_LIMITS[p].label}
              </th>
            ))}
            <th className="px-3 py-2.5 font-semibold">Última lectura</th>
            <th className="px-3 py-2.5 font-semibold">MAC · firmware</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map(({ node, status, chips }) => {
            const meta = STATUS_META[status];
            return (
              <tr key={node.id} onClick={() => onOpenNode(node)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-kanan-900">{node.ubicacion || node.node_id}</span>{" "}
                  <span className="text-slate-400">— {node.node_id}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "live" || status === "alert" ? "animate-pulse-dot" : ""}`}
                      style={{ background: meta.dot }}
                    />
                    {meta.label}
                  </span>
                </td>
                {chips.map((c) => (
                  <td
                    key={c.label}
                    className={`px-3 py-2.5 whitespace-nowrap ${
                      c.tone === "alert" ? "text-status-alert font-semibold" : c.tone === "neutral" ? "text-slate-400" : "text-status-ok"
                    }`}
                  >
                    {c.value}
                  </td>
                ))}
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{timeAgo(node.timestamp)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-400 font-mono">
                  {node.mac} · {node.version_firmware}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function NodosView({ nodes, onOpenNode, canAddNode, onAddNode }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("grid");
  const [now, setNow] = useState(Date.now());
  const [flashing, setFlashing] = useState({});
  const prevTsRef = useRef({});

  // Recalcula estado ("hace X", live→silent por vencimiento) sin volver a pedir datos.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  // Destello de "dato nuevo": se dispara cuando el timestamp de un nodo cambia,
  // lo cual solo ocurre por el evento real telemetria:live (ver App.jsx).
  useEffect(() => {
    nodes.forEach((n) => {
      const prev = prevTsRef.current[n.id];
      if (n.timestamp && prev && prev !== n.timestamp) {
        setFlashing((f) => ({ ...f, [n.id]: true }));
        setTimeout(() => {
          setFlashing((f) => {
            if (!f[n.id]) return f;
            const next = { ...f };
            delete next[n.id];
            return next;
          });
        }, 1300);
      }
      prevTsRef.current[n.id] = n.timestamp;
    });
  }, [nodes]);

  const enriched = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return nodes.map((n) => {
      const status = computeNodeStatus(n, now);
      const haystack = `${n.node_id} ${n.ubicacion} ${n.mac}`.toLowerCase();
      return {
        node: n,
        status,
        matchesSearch: !ql || haystack.includes(ql),
        chips: PARAMS.map((p) => paramChip(n, status, p)),
      };
    });
  }, [nodes, now, q]);

  const counts = useMemo(() => {
    const c = { all: enriched.length, live: 0, alert: 0, silent: 0, off: 0 };
    enriched.forEach((e) => { c[e.status] += 1; });
    return c;
  }, [enriched]);

  const visible = enriched.filter((e) => (filter === "all" || e.status === filter) && e.matchesSearch);

  return (
    <div className="flex-1 w-full flex flex-col gap-5 overflow-y-auto min-h-0 relative pr-1">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center flex-shrink-0">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, ubicación o MAC…"
          className="input-base flex-1 min-w-[220px] max-w-sm h-9 text-sm"
        />

        <div className="flex items-center border border-slate-300 flex-wrap">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === key ? "bg-kanan-700 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex items-center border border-slate-300 sm:ml-auto">
          <button
            onClick={() => setMode("grid")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mode === "grid" ? "bg-kanan-700 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setMode("table")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mode === "table" ? "bg-kanan-700 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tabla
          </button>
        </div>

        {canAddNode && (
          <button onClick={onAddNode} className="btn-primary text-xs">
            + Registrar nodo
          </button>
        )}
      </div>

      {/* Contenido */}
      {nodes.length === 0 ? (
        <EmptyState message="No hay nodos registrados." />
      ) : visible.length === 0 ? (
        <EmptyState
          message={q.trim() ? `No hay nodos que coincidan con "${q.trim()}" en el filtro actual.` : "Ningún nodo tiene ese estado en este momento."}
          onReset={() => { setQ(""); setFilter("all"); }}
        />
      ) : mode === "grid" ? (
        <GridView items={visible} flashing={flashing} onOpenNode={onOpenNode} />
      ) : (
        <TableView items={visible} onOpenNode={onOpenNode} />
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap flex-shrink-0 text-xs text-slate-400 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META.live.dot }} />
          En línea · parámetros en norma
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META.alert.dot }} />
          Alerta activa sin resolver
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META.silent.dot }} />
          Sin señal · &gt; 5 min sin transmitir
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META.off.dot }} />
          Inactivo · desactivado por admin
        </span>
      </div>
    </div>
  );
}
