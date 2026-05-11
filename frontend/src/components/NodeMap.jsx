import { useEffect, useRef, useState, useCallback } from "react";
import { NOM_127_LIMITS, PARAMS } from "../constants";

// ── CU BUAP coordinates ─────────────────────────────
// Ciudad Universitaria, Benemérita Universidad Autónoma de Puebla
const CU_CENTER = [19.001116496808024, -98.20175497632175];
const CU_ZOOM = 16;

const STORAGE_KEY = "aquamonitor_node_positions";

// Status colors
const STATUS_COLOR = {
  activo: "#1a8a55",
  alerta: "#ef4444",
  inactivo: "#94a3b8",
};

// Default positions around CU BUAP for nodes that have none saved
const DEFAULT_OFFSETS = [
  [19.04600, -98.19950],
  [19.04280, -98.20100],
  [19.04500, -98.19700],
  [19.04200, -98.19800],
  [19.04700, -98.19800],
];

function loadSavedPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
}
function savePositions(positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// Build a colored SVG marker icon for Leaflet
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
  if (node.valores) {
    const isOut = PARAMS.some((p) => {
      const l = NOM_127_LIMITS[p];
      return node.valores[p] < l.min || node.valores[p] > l.max;
    });
    if (isOut) return STATUS_COLOR.alerta;
  }
  return STATUS_COLOR[node.status] || STATUS_COLOR.activo;
}

// Popup card content
function buildPopupHTML(node, color) {
  const vals = node.valores;
  const isOut = (param) => {
    if (!vals) return false;
    const l = NOM_127_LIMITS[param];
    return vals[param] < l.min || vals[param] > l.max;
  };
  const paramRows = vals ? PARAMS.map((p) => {
    const l = NOM_127_LIMITS[p];
    const out = isOut(p);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:11px;color:#64748b;font-family:DM Sans,sans-serif;">${l.label}</span>
        <span style="font-size:12px;font-weight:600;font-family:JetBrains Mono,monospace;color:${out ? "#dc2626" : "#1e3a8a"};">
          ${vals[p]} <span style="font-size:10px;font-weight:400;color:#94a3b8;">${l.unit}</span>
          ${out ? '<span style="margin-left:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:1px 5px;border-radius:4px;font-size:9px;">!</span>' : ""}
        </span>
      </div>`;
  }).join("") : `<p style="font-size:11px;color:#94a3b8;padding:8px 0;">Sin datos de telemetría</p>`;

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

  const isDraggable = isAdmin && dragMode;

  // ── Init Leaflet map ──────────────────────────────
  useEffect(() => {
    if (leafletRef.current) return;
    import("leaflet").then((L) => {
      // Fix default marker icon paths broken by Vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: CU_CENTER,
        zoom: CU_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Google Maps tiles
      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: '&copy; Google Maps',
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
        m.options.draggable !== isDraggable && (isDraggable ? m.dragging.enable() : m.dragging.disable());
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
      // Leaflet may still be loading; retry
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

  const handleLocateUser = () => {
    if (!leafletRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        const { map, L } = leafletRef.current;
        map.flyTo([latitude, longitude], 18, { animate: true, duration: 1.5 });

        if (!leafletRef.current.userMarker) {
          const userIcon = L.divIcon({
            html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.8)"></div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          leafletRef.current.userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
        } else {
          leafletRef.current.userMarker.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        setLocating(false);
        console.warn("Error de geolocalización:", err);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="flex gap-5 flex-1 min-h-0 animate-fade-in">
      {/* ── Left Sidebar: Nodes List ── */}
      <div className="w-72 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-shrink-0 relative">
        <div className="sticky top-0 bg-slate-50 py-2 z-10 border-b border-slate-200 mb-1">
          <h2 className="text-sm font-bold text-buap-900">
            Nodos registrados ({nodes.length})
          </h2>
        </div>
        <div className="flex flex-col gap-3 px-1 pb-1">
          {nodes.map((node) => {
            const color = getNodeColor(node);
            const isSel = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`card-hover p-4 cursor-pointer transition-all ${isSel ? "ring-2 ring-offset-2" : ""
                  }`}
                style={isSel ? { "--tw-ring-color": color, borderColor: color + "50" } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-buap-900 truncate" title={node.ubicacion}>
                      {node.ubicacion}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{node.node_id}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-semibold" style={{ color }}>
                        {node.valores ? `pH ${node.valores.ph} · ${node.valores.temperatura}°C` : "Sin datos"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Admin controls */}
          {isAdmin && (
            <div className="mt-2 pt-4 border-t border-slate-200 flex flex-col gap-2">
              <button
                onClick={() => { setDragMode((v) => !v); setUnsaved(false); }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${dragMode
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-buap-300 hover:text-buap-700 shadow-sm"
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
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all shadow-sm"
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

      {/* ── Right Area: Map ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Map */}
        <div className="card overflow-hidden flex-1 border border-slate-200/60 shadow-inner min-h-[400px] relative">
          <div ref={mapRef} className="w-full h-full" />
          <button
            onClick={handleLocateUser}
            disabled={locating}
            title="Mi ubicación"
            className="absolute bottom-6 right-6 z-[400] w-12 h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-buap-700 hover:bg-slate-50 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
          >
            {locating ? (
              <span className="w-5 h-5 border-2 border-slate-200 border-t-buap-700 rounded-full animate-spin" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
