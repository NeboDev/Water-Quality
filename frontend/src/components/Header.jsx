import { useState, useRef, useEffect } from "react";

const STATUS = {
  activo: { label: "Activo", dot: "#1a8a55" },
  alerta: { label: "Alerta", dot: "#ef4444" },
  inactivo: { label: "Sin señal", dot: "#94a3b8" },
};

const STATUS_CHIP = {
  activo: "chip-success",
  alerta: "chip-danger",
  inactivo: "chip-neutral",
};

const ROLE_BADGE = {
  admin: "bg-buap-100 text-buap-700",
  icuap: "bg-violet-100 text-violet-700",
  operador: "bg-amber-100 text-amber-700",
  visualizador: "bg-slate-200 text-slate-500",
};
const ROLE_LABEL = {
  admin: "Admin", icuap: "ICUAP", operador: "Operador", visualizador: "Visualizador",
};

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

export default function Header({
  nodes, selectedNode, onSelectNode,
  view, onViewChange,
  user, onLogout,
  canAddNode, onAddNode,
  canAddUser, onAddUser,
  canConfigNodes, onConfigNodes,
  canViewReports,
  globalAlerts, setShowGlobalAlerts,
}) {
  const lastUpdate = selectedNode
    ? new Date(selectedNode.timestamp).toLocaleTimeString("es-MX")
    : "—";

  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const nodeRef = useRef(null);
  const userRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useClickOutside(nodeRef, () => setNodeMenuOpen(false));
  useClickOutside(userRef, () => setUserMenuOpen(false));
  useClickOutside(mobileMenuRef, () => setMobileMenuOpen(false));

  const selectNode = (node) => {
    onSelectNode(node);
    setNodeMenuOpen(false);
  };

  const handleUserAction = (fn) => {
    setUserMenuOpen(false);
    fn?.();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 z-20">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-buap-900 rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M16 2C11 10 5 13 5 21a11 11 0 0022 0c0-8-6-11-11-19z" fill="white" />
            <circle cx="16" cy="21" r="2.5" fill="rgba(255,255,255,0.4)" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-buap-900 leading-none tracking-tight">Kanan</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5 hidden sm:block">Sistema de Monitoreo IoT</p>
        </div>
      </div>

      <div className="hidden sm:block w-px h-7 bg-slate-200 mx-1 flex-shrink-0" />

      {/* ── Node dropdown ── */}
      <div className="relative flex-1 min-w-0" ref={nodeRef}>
        {view === "dashboard" && (
          <>
            <button
              onClick={() => setNodeMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-150 min-w-0 max-w-[120px] sm:max-w-xs ${nodeMenuOpen ? "bg-buap-50 ring-2 ring-buap-200" : "bg-slate-100 hover:bg-slate-200"
                }`}
            >
              {/* Status dot */}
              {selectedNode && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS[selectedNode.status]?.dot ?? "#94a3b8" }}
                />
              )}
              <div className="flex flex-col leading-none text-left min-w-0">
                <span className="text-[9px] text-slate-400 font-medium">Nodo activo</span>
                <span className="text-sm font-semibold text-buap-900 truncate">
                  {selectedNode ? (selectedNode.ubicacion || selectedNode.node_id) : "Seleccionar…"}
                </span>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1 ${nodeMenuOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Node dropdown panel */}
            {nodeMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-1">
                    {nodes.length} nodo{nodes.length !== 1 ? "s" : ""} registrados
                  </p>
                </div>

                <div className="px-2 pb-2 max-h-64 overflow-y-auto">
                  {nodes.map((node) => {
                    const st = STATUS[node.status] ?? STATUS.inactivo;
                    const isSel = node.id === selectedNode?.id;
                    return (
                      <button
                        key={node.id}
                        onClick={() => selectNode(node)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${isSel ? "bg-buap-50 ring-1 ring-inset ring-buap-200" : "hover:bg-slate-50"
                          }`}
                      >
                        {/* indicador de estado del nodo */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${node.status === "activo" ? "animate-pulse-dot" : ""}`}
                            style={{ background: st.dot }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold truncate ${isSel ? "text-buap-800" : "text-slate-800"}`}>
                              {node.node_id}
                            </p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${node.status === "activo" ? "bg-emerald-100 text-emerald-700" :
                              node.status === "alerta" ? "bg-red-100 text-red-600" :
                                "bg-slate-100 text-slate-400"
                              }`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{node.ubicacion}</p>
                          {node.valores && (
                            <p className="text-[10px] font-mono text-buap-600 mt-0.5">
                              pH {node.valores.ph} · {node.valores.temperatura}°C
                            </p>
                          )}
                        </div>

                        {/* Checkmark if selected */}
                        {isSel && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-buap-600">
                            <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>


                <div className="border-t border-slate-100 px-2 py-2 flex flex-col gap-1">

                  {/* conexion al endpoint de configuracion de nodos */}
                  <button
                    disabled={!canConfigNodes}
                    onClick={() => { if (canConfigNodes) { setNodeMenuOpen(false); onConfigNodes(); } }}
                    title={!canConfigNodes ? "Solo el Administrador puede configurar nodos" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${canConfigNodes ? "hover:bg-slate-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${canConfigNodes ? "bg-slate-100" : "bg-slate-100"}`}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="2" stroke={canConfigNodes ? "#475569" : "#94a3b8"} strokeWidth="1.3" />
                        <path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.1 3.1l.7.7M10.2 10.2l.7.7M10.2 3.8l-.7.7M3.8 10.2l-.7.7" stroke={canConfigNodes ? "#475569" : "#94a3b8"} strokeWidth="1.1" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Configuración de nodos
                        {!canConfigNodes && (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <rect x="1.5" y="4.5" width="8" height="6" rx="1.2" stroke="#94a3b8" strokeWidth="1" />
                            <path d="M3.5 4.5V3a2 2 0 014 0v1.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Editar, activar o eliminar nodos</p>
                    </div>
                  </button>

                  {/* add node */}
                  <button
                    disabled={!canAddNode}
                    onClick={() => { if (canAddNode) { setNodeMenuOpen(false); onAddNode(); } }}
                    title={!canAddNode ? "Solo el Administrador puede registrar nodos" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${canAddNode ? "hover:bg-buap-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${canAddNode ? "bg-buap-100" : "bg-slate-100"}`}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="2" width="10" height="10" rx="2" stroke={canAddNode ? "#2333ce" : "#94a3b8"} strokeWidth="1.3" />
                        <path d="M7 5v4M5 7h4" stroke={canAddNode ? "#2333ce" : "#94a3b8"} strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Registrar nuevo nodo
                        {!canAddNode && (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <rect x="1.5" y="4.5" width="8" height="6" rx="1.2" stroke="#94a3b8" strokeWidth="1" />
                            <path d="M3.5 4.5V3a2 2 0 014 0v1.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Agregar sensor IoT al sistema</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>



      {/* toggle para pantallas pequenias*/}
      {(() => {
        const viewOptions = [
          {
            id: "overview", title: "Vista general",
            icon: (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <rect x="1" y="1" width="3" height="13" rx="0.5" />
                <rect x="6" y="1" width="3" height="13" rx="0.5" />
                <rect x="11" y="1" width="3" height="13" rx="0.5" />
              </svg>
            ),
          },
          {
            id: "dashboard", title: "Métricas por nodo",
            icon: (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" />
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" />
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" />
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" />
              </svg>
            ),
          },
          {
            id: "map", title: "Mapa de nodos",
            icon: (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1a4 4 0 100 7 4 4 0 000-7z" fill="currentColor" opacity="0.8" />
                <path d="M5 13c0-1.38 1.12-2.5 2.5-2.5S10 11.62 10 13H5z" fill="currentColor" opacity="0.5" />
                <circle cx="7.5" cy="4.5" r="1.5" fill="currentColor" opacity="0.3" />
              </svg>
            ),
          },
          // Reportes: solo visible para admin / icuap
          ...(canViewReports ? [{
            id: "reportes", title: "Reportes",
            icon: (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="2" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.9" />
                <path d="M11.3 12h1.4M12 11.3v1.4" stroke="white" strokeWidth="1" strokeLinecap="round" />
              </svg>
            ),
          }] : []),
        ];

        return (
          <>
            {/* Desktop View toggle */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
              {viewOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  title={v.title}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${view === v.id ? "bg-white text-buap-700 shadow-card" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  {v.icon}
                  <span className="hidden sm:inline">{v.title}</span>
                </button>
              ))}
            </div>

            {/* Mobile View*/}
            <div className="relative md:hidden flex-shrink-0" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className={`p-2 rounded-xl transition-all duration-150 select-none ${mobileMenuOpen ? "bg-buap-50 ring-2 ring-buap-200 text-buap-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                title="Menú de vistas"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  {mobileMenuOpen ? (
                    <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  ) : (
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  )}
                </svg>
              </button>

              {/* Mobile menu dropdown */}
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1.5">Cambiar vista</p>
                  </div>
                  <div className="px-2 pb-2 flex flex-col gap-1">
                    {viewOptions.map((v) => {
                      const isSel = view === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            onViewChange(v.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${isSel ? "bg-buap-50 text-buap-700 ring-1 ring-inset ring-buap-200 font-semibold" : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                            }`}
                        >
                          <span className={isSel ? "text-buap-600" : "text-slate-400"}>
                            {v.icon}
                          </span>
                          <span className="text-xs">{v.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      <div className="hidden sm:block w-px h-7 bg-slate-200 mx-1 flex-shrink-0" />

      {/* campana de alertas */}
      <button
        onClick={() => setShowGlobalAlerts(true)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        title="Ver alertas"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a2 2 0 01-2-2h4a2 2 0 01-2 2z" fill="currentColor" />
        </svg>
        {globalAlerts?.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* menu del usuario*/}
      {user && (
        <div className="relative flex-shrink-0" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl transition-all duration-150 select-none ${userMenuOpen ? "bg-buap-50 ring-2 ring-buap-200" : "bg-slate-100 hover:bg-slate-200"
              }`}
          >
            <div className="w-6 h-6 rounded-full bg-buap-100 flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4.5" r="2.2" stroke="#2333ce" strokeWidth="1.2" />
                <path d="M1.5 11.5c0-2.2 2.24-3.5 5-3.5s5 1.3 5 3.5" stroke="#2333ce" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none gap-0.5 text-left">
              <span className="text-xs font-semibold text-buap-800">{user.nombre}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full w-fit ${ROLE_BADGE[user.rol] ?? "bg-slate-200 text-slate-500"}`}>
                {ROLE_LABEL[user.rol] ?? user.rol}
              </span>
            </div>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`text-slate-400 transition-transform duration-200 flex-shrink-0 hidden sm:block ${userMenuOpen ? "rotate-180" : ""}`}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in">

              {/* Info usuario */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <p className="text-xs font-bold text-buap-900 truncate">{user.nombre}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email ?? ""}</p>
              </div>

              {/* Acciones */}
              <div className="px-2 py-2 flex flex-col gap-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1.5">Administración</p>

                {/* Nuevo usuario */}
                <button
                  disabled={!canAddUser}
                  onClick={() => canAddUser && handleUserAction(onAddUser)}
                  title={!canAddUser ? "Solo el Administrador puede crear usuarios" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${canAddUser ? "hover:bg-buap-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${canAddUser ? "bg-violet-100" : "bg-slate-100"}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="5.5" cy="4.5" r="2" stroke={canAddUser ? "#7c3aed" : "#94a3b8"} strokeWidth="1.3" />
                      <path d="M1.5 11.5c0-2 1.8-3.5 4-3.5" stroke={canAddUser ? "#7c3aed" : "#94a3b8"} strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M10 8v4M8 10h4" stroke={canAddUser ? "#7c3aed" : "#94a3b8"} strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      Nuevo usuario
                      {!canAddUser && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <rect x="1.5" y="4.5" width="8" height="6" rx="1.2" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M3.5 4.5V3a2 2 0 014 0v1.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Crear cuenta y asignar rol</p>
                  </div>
                </button>

                {/* Configuración de nodos */}
                <button
                  disabled={!canConfigNodes}
                  onClick={() => canConfigNodes && handleUserAction(onConfigNodes)}
                  title={!canConfigNodes ? "Solo el Administrador puede configurar nodos" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${canConfigNodes ? "hover:bg-slate-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                    }`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="2" stroke={canConfigNodes ? "#475569" : "#94a3b8"} strokeWidth="1.3" />
                      <path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.1 3.1l.7.7M10.2 10.2l.7.7M10.2 3.8l-.7.7M3.8 10.2l-.7.7" stroke={canConfigNodes ? "#475569" : "#94a3b8"} strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      Configuración de nodos
                      {!canConfigNodes && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <rect x="1.5" y="4.5" width="8" height="6" rx="1.2" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M3.5 4.5V3a2 2 0 014 0v1.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Editar, activar o eliminar nodos</p>
                  </div>
                </button>

                {/* Registrar nuevo nodo */}
                <button
                  disabled={!canAddNode}
                  onClick={() => canAddNode && handleUserAction(onAddNode)}
                  title={!canAddNode ? "Solo el Administrador puede registrar nodos" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${canAddNode ? "hover:bg-buap-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${canAddNode ? "bg-buap-100" : "bg-slate-100"}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="2" width="10" height="10" rx="2" stroke={canAddNode ? "#2333ce" : "#94a3b8"} strokeWidth="1.3" />
                      <path d="M7 5v4M5 7h4" stroke={canAddNode ? "#2333ce" : "#94a3b8"} strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      Registrar nuevo nodo
                      {!canAddNode && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <rect x="1.5" y="4.5" width="8" height="6" rx="1.2" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M3.5 4.5V3a2 2 0 014 0v1.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Agregar sensor IoT al sistema</p>
                  </div>
                </button>
              </div>

              {/* Cerrar sesión */}
              <div className="px-2 pb-2 border-t border-slate-100 pt-2">
                <button
                  onClick={() => { setUserMenuOpen(false); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-red-50 transition-all duration-150 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9.5 9.5l3-2.5-3-2.5M12.5 7H5"
                        stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-red-500">Cerrar sesión</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Confirmar Cerrar Sesión */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4 transform transition-all">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 16l4-4-4-4M19 12H9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Cerrar sesión</h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
              ¿Estás seguro de que deseas salir del panel de monitoreo?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-ghost flex-1 justify-center text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-600/20"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
