import { useEffect, useRef, useState, useCallback } from "react";
import { NOM_127_LIMITS, PARAMS } from "../constants";
import CardCorners from "../components/common/CardCorners";

//cu coords
const CU_CENTER = [19.001116496808024, -98.20175497632175];
const CU_ZOOM = 16;

const STORAGE_KEY = "aquamonitor_node_positions";

// node color status
const STATUS_COLOR = {
  activo: "#4f7f5b",
  alerta: "#b03a2b",
  inactivo: "#9a9a9c",
};

// default node positions
const DEFAULT_OFFSETS = [
  [19.001116, -98.201754],
  [19.003500, -98.204000],
  [18.998500, -98.199000],
  [19.004000, -98.198500],
  [18.997000, -98.205000],
];

function loadSavedPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
}
function savePositions(positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// node icons
function buildIcon(L, color, isSelected, isDraggable) {
  const size = isSelected ? 40 : 32;

  const animation = `
    <style>
      @keyframes ripple {
        0% { r: ${isSelected ? 7 : 5}px; opacity: 0.6; }
        100% { r: ${isSelected ? 20 : 16}px; opacity: 0; }
      }
      .wave {
        animation: ripple 2s infinite ease-out;
        fill: ${color};
        transform-origin: center;
      }
    </style>
  `;

  const wave = `<circle cx="24" cy="24" r="5" class="wave" />`;

  const drag = isDraggable ? `
    <circle cx="24" cy="24" r="5" fill="white" fill-opacity="0.8"/>
    <path d="M21 24h6M24 21v6" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>` : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 16}" height="${size + 16}" viewBox="0 0 48 48">
      ${animation}
      ${wave}
      <circle cx="24" cy="24" r="${isSelected ? 12 : 9}" fill="white" stroke="${color}" stroke-width="${isSelected ? 3 : 2}"/>
      <circle cx="24" cy="24" r="${isSelected ? 6 : 4.5}" fill="${color}"/>
      ${drag}
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function getNodeColor(node) {
  if (node.status === "inactivo") return STATUS_COLOR.inactivo;
  return STATUS_COLOR[node.status] || STATUS_COLOR.activo;
}

// popup when press node on the map
function buildPopupHTML(node, color) {
  const vals = node.valores;
  const isOut = (param) => {
    if (!vals || vals[param] === undefined || vals[param] === null) return false;
    const l = NOM_127_LIMITS[param];
    return vals[param] < l.min || vals[param] > l.max;
  };
  
  const activeParams = vals ? PARAMS.filter((p) => vals[p] !== undefined && vals[p] !== null) : [];
  const paramRows = activeParams.length > 0 
    ? activeParams.map((p) => {
        const l = NOM_127_LIMITS[p];
        const out = isOut(p);
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;color:#64748b;font-family:DM Sans,sans-serif;">${l.label}</span>
            <span style="font-size:12px;font-weight:600;font-family:JetBrains Mono,monospace;color:${out ? "#b03a2b" : "#1e3a8a"};">
              ${vals[p]} <span style="font-size:10px;font-weight:400;color:#94a3b8;">${l.unit}</span>
              ${out ? '<span style="margin-left:4px;background:#fdf1ee;color:#b03a2b;border:1px solid #b03a2b66;padding:1px 5px;font-size:9px;">!</span>' : ""}
            </span>
          </div>`;
      }).join("") 
    : `<p style="font-size:11px;color:#94a3b8;padding:8px 0;">Sin datos de telemetría</p>`;

  return `
    <div style="min-width:220px;padding:12px 14px;font-family:DM Sans,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
        <div>
          <p style="margin:0;font-size:13px;font-weight:700;color:#0d2a4f;">${node.node_id}</p>
          <p style="margin:0;font-size:11px;color:#94a3b8;">${node.ubicacion}</p>
        </div>
      </div>
      <div style="margin-bottom:6px;">${paramRows}</div>
    </div>`;
}

export default function NodeMap({ nodes, selectedNode, onSelectNode, isAdmin }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef({});
  const [positions, setPositions] = useState(() => loadSavedPositions());
  const [dragMode, setDragMode] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const isDraggable = isAdmin && dragMode;

  useEffect(() => {
    if (leafletRef.current) return;
    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const CU_BOUNDS = [
        [18.9850, -98.2150], // Suroeste
        [19.0150, -98.1850], // Noreste
      ];

      const map = L.map(mapRef.current, {
        center: CU_CENTER,
        zoom: CU_ZOOM,
        minZoom: 15,
        maxBounds: CU_BOUNDS,
        maxBoundsViscosity: 1.0, // impide ir mas alla del recuadro en ventana
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // estilo de caartodb
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      leafletRef.current = { map, L };
      setMapReady(true);
    });

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // ── Sync markers when nodes / positions / selection change ──
  const syncMarkers = useCallback(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;

    nodes.forEach((node, idx) => {
      const savedPos = positions[node.id];
      const latLng = savedPos
        ? [savedPos.lat, savedPos.lng]
        : DEFAULT_OFFSETS[idx % DEFAULT_OFFSETS.length];

      const isSel = selectedNode?.id === node.id;
      const color = getNodeColor(node);
      const icon = buildIcon(L, color, isSel, isDraggable);

      if (markersRef.current[node.id]) {
        // Update existing marker
        const m = markersRef.current[node.id];
        m.setIcon(icon);
        m.setLatLng(latLng);
        if (m.dragging && m.options.draggable !== isDraggable) {
          if (isDraggable) {
            m.dragging.enable();
          } else {
            m.dragging.disable();
          }
          m.options.draggable = isDraggable;
        }
        m.getPopup()?.setContent(buildPopupHTML(node, color));
      } else {
        // Create new marker
        const marker = L.marker(latLng, { icon, draggable: isDraggable })
          .addTo(map)
          .bindPopup(buildPopupHTML(node, color), { maxWidth: 280, minWidth: 240 });

        marker.on("click", () => onSelectNode(node));

        marker.on("dragend", (e) => {
          const { lat, lng } = e.target.getLatLng();
          setPositions((prev) => {
            const next = { ...prev, [node.id]: { lat, lng } };
            savePositions(next);
            return next;
          });
          setUnsaved(true);
        });

        markersRef.current[node.id] = marker;
      }
    });

    // Remove markers for nodes no longer in the list
    Object.keys(markersRef.current).forEach((id) => {
      if (!nodes.find((n) => n.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [nodes, selectedNode, positions, isDraggable, onSelectNode]);

  useEffect(() => {
    if (!leafletRef.current) {
      // Leaflet may still be loading, so retry
      const t = setTimeout(syncMarkers, 400);
      return () => clearTimeout(t);
    }
    syncMarkers();
  }, [syncMarkers]);

  // Pan to selected node
  useEffect(() => {
    if (!mapReady || !selectedNode) return;

    let pos = positions[selectedNode.id];
    if (!pos) {
      const idx = nodes.findIndex(n => n.id === selectedNode.id);
      if (idx !== -1) {
        const [lat, lng] = DEFAULT_OFFSETS[idx % DEFAULT_OFFSETS.length];
        pos = { lat, lng };
      }
    }

    if (pos) {
      leafletRef.current.map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
    }
  }, [selectedNode?.id, mapReady, nodes, positions]);

  const handleResetPositions = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPositions({});
    setUnsaved(false);
    // Reposition markers to defaults
    nodes.forEach((node, idx) => {
      const m = markersRef.current[node.id];
      if (m) m.setLatLng(DEFAULT_OFFSETS[idx % DEFAULT_OFFSETS.length]);
    });
  };


  return (
    <div className="flex gap-0 lg:gap-5 flex-1 min-h-0 animate-fade-in relative">
      
      {/* Overlay backdrop for mobile drawer */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[1010] animate-fade-in"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* node list left sidebar */}
      <div
        className={`
          flex flex-col gap-3 flex-shrink-0 min-h-0
          transition-all duration-300 ease-out
          ${showSidebar
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
          }
          fixed inset-y-4 left-4 w-72 bg-white border border-slate-300 z-[1020] p-4
          lg:static lg:w-72 lg:bg-transparent lg:border-none lg:p-0 lg:h-full lg:z-auto
        `}
      >
        <div className="lg:hidden"><CardCorners /></div>
        <div className="bg-white lg:bg-slate-50 py-2 z-10 border-b border-slate-300 mb-1 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-kanan-900">
            Nodos registrados ({nodes.length})
          </h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Cerrar lista"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 px-1 pt-2 pb-1">
          {nodes.length === 0 ? (
            <div className="p-4 text-center flex flex-col items-center gap-2 mt-2 text-slate-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
              </svg>
              <p className="text-xs">Sin nodos registrados</p>
            </div>
          ) : (
            nodes.map((node) => {
              const color = getNodeColor(node);
              const isSel = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    setShowSidebar(false); // close sidebar on select on mobile
                  }}
                  className={`card-hover p-4 cursor-pointer transition-colors ${isSel ? "outline outline-2 outline-offset-2" : ""
                    }`}
                  style={isSel ? { outlineColor: color, borderColor: color } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-kanan-900 truncate" title={node.ubicacion}>
                        {node.ubicacion}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{node.node_id}</p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] font-sans font-semibold tracking-wide" style={{ color }}>
                          {node.status === "inactivo"
                            ? "Inactivo"
                            : !node.valores
                              ? "Sin datos"
                              : (node.status === "alerta" ? "Alerta" : "Correcto")
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Admin controls */}
          {isAdmin && nodes.length > 0 && (
            <div className="mt-2 pt-4 border-t border-slate-300 flex flex-col gap-2">
              <button
                onClick={() => { setDragMode((v) => !v); setUnsaved(false); }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors ${dragMode
                  ? "bg-status-warn/10 border-status-warn text-status-warn"
                  : "bg-white border-slate-300 text-slate-600 hover:border-kanan-400 hover:text-kanan-700"
                  }`}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                {dragMode ? "Salir de edición" : "Editar posiciones del mapa"}
              </button>

              {unsaved && (
                <button
                  onClick={handleResetPositions}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-status-alert/10 border border-status-alert/40 text-status-alert hover:bg-status-alert/20 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6a4 4 0 014-4 4 4 0 013.46 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M8 2l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 6a4 4 0 01-4 4 4 4 0 01-3.46-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Restablecer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* map, right panel */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* map*/}
        <div className="card overflow-hidden flex-1 min-h-[400px]">
          <CardCorners />
          <div ref={mapRef} className="w-full h-full" />

          {/* Floating Toggle Button (visible only on small screens) */}
          {nodes.length > 0 && (
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden absolute top-3 right-3 z-[999] flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-slate-300 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 select-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1.5 3h11M1.5 7h11M1.5 11h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>Ver nodos ({nodes.length})</span>
            </button>
          )}

          {nodes.length === 0 && (
            <div className="absolute inset-0 z-[1000] bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="relative flex flex-col items-center gap-3 text-slate-500 bg-white p-6 border border-slate-300">
                <CardCorners />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
                </svg>
                <p className="text-sm font-medium">No hay nodos registrados para mostrar en el mapa.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
