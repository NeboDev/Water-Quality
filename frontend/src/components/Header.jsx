import { useState, useRef, useEffect } from "react";
import kananLogo from "../assets/images/kanan_logo.png";
import CardCorners from "./common/CardCorners";

const STATUS = {
  activo: { label: "Activo", dot: "#4f7f5b" },
  alerta: { label: "Alerta", dot: "#b03a2b" },
  inactivo: { label: "Sin señal", dot: "#9a9a9c" },
};

const STATUS_CHIP = {
  activo: "chip-success",
  alerta: "chip-danger",
  inactivo: "chip-neutral",
};

const ROLE_BADGE = {
  admin: "bg-kanan-100 text-kanan-700",
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
  globalAlerts, onOpenAlerts,
  socketConnected,
}) {
  const alertsCount = globalAlerts?.length || 0;

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
    <header className="h-16 bg-white border-b border-slate-300 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 z-20">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src={kananLogo} alt="Kanan" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold text-kanan-900 leading-none tracking-tight">Kanan</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5 hidden sm:block">Sistema de Monitoreo IoT</p>
        </div>
      </div>

      <div className="hidden sm:block w-px h-7 bg-slate-300 mx-1 flex-shrink-0" />

      {/* ── Node dropdown ── */}
      <div className="relative flex-1 min-w-0" ref={nodeRef}>
        {view === "nodos" && (
          <>
            <button
              onClick={() => setNodeMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-150 w-full min-w-0 max-w-[120px] sm:max-w-xs overflow-hidden ${nodeMenuOpen ? "bg-kanan-100 ring-1 ring-kanan-300" : "bg-slate-100 hover:bg-slate-200"
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
                <span className="text-sm font-semibold text-kanan-900 truncate">
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
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-300 overflow-hidden z-50 animate-fade-in">
                <CardCorners />
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ${isSel ? "bg-kanan-100 ring-1 ring-inset ring-kanan-300" : "hover:bg-slate-50"
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
                            <p className={`text-xs font-semibold truncate ${isSel ? "text-kanan-800" : "text-slate-800"}`}>
                              {node.node_id}
                            </p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 flex-shrink-0 ${node.status === "activo" ? "bg-status-ok/10 text-status-ok" :
                              node.status === "alerta" ? "bg-status-alert/10 text-status-alert" :
                                "bg-slate-100 text-slate-400"
                              }`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{node.ubicacion}</p>
                          {node.valores && (
                            <p className="text-[10px] font-mono text-kanan-600 mt-0.5">
                              pH {node.valores.ph} · {node.valores.temperatura}°C
                            </p>
                          )}
                        </div>

                        {/* Checkmark if selected */}
                        {isSel && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-kanan-600">
                            <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>


                {(canConfigNodes || canAddNode) && (
                  <div className="border-t border-slate-300 px-2 py-2 flex flex-col gap-1">
                    {/* conexion al endpoint de configuracion de nodos */}
                    {canConfigNodes && (
                      <button
                        onClick={() => { setNodeMenuOpen(false); onConfigNodes(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="2" stroke="#475569" strokeWidth="1.3" />
                            <path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.1 3.1l.7.7M10.2 10.2l.7.7M10.2 3.8l-.7.7M3.8 10.2l-.7.7" stroke="#475569" strokeWidth="1.1" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Configuración de nodos
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Editar, activar o eliminar nodos</p>
                        </div>
                      </button>
                    )}

                    {/* add node */}
                    {canAddNode && (
                      <button
                        onClick={() => { setNodeMenuOpen(false); onAddNode(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-kanan-100 cursor-pointer"
                      >
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-kanan-100">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="2" y="2" width="10" height="10" rx="2" stroke="#2333ce" strokeWidth="1.3" />
                            <path d="M7 5v4M5 7h4" stroke="#2333ce" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Registrar nuevo nodo
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Agregar sensor IoT al sistema</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
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
            id: "nodos", title: "Nodos",
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
            <div className="hidden md:flex items-center border border-slate-300 flex-shrink-0">
              {viewOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  title={v.title}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${view === v.id ? "bg-kanan-700 text-white" : "text-slate-500 hover:text-slate-700"
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
                className={`p-2 transition-colors duration-150 select-none ${mobileMenuOpen ? "bg-kanan-100 ring-1 ring-kanan-300 text-kanan-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-300 overflow-hidden z-50 animate-fade-in">
                  <CardCorners />
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
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ${isSel ? "bg-kanan-100 text-kanan-700 ring-1 ring-inset ring-kanan-300 font-semibold" : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                            }`}
                        >
                          <span className={isSel ? "text-kanan-600" : "text-slate-400"}>
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

      <div className="hidden sm:block w-px h-7 bg-slate-300 mx-1 flex-shrink-0" />

      {/* indicador de conexion en tiempo real */}
      <div
        className={`hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border flex-shrink-0 transition-colors ${
          socketConnected
            ? "bg-status-ok/10 border-status-ok/40 text-status-ok"
            : "bg-status-warn/10 border-status-warn/60 text-status-warn"
        }`}
        title={socketConnected ? "Conexión en tiempo real activa" : "Intentando reconectar con el servidor…"}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${socketConnected ? "animate-pulse-dot" : "animate-pulse"}`}
          style={{ background: socketConnected ? "#4f7f5b" : "#c8901f" }}
        />
        {socketConnected ? "Conectado en tiempo real" : "Reconectando…"}
      </div>

      {/* campana de alertas */}
      <button
        onClick={() => onOpenAlerts?.(null)}
        className="relative flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 border border-slate-300"
        title="Ver todas las alertas"
      >
        <div className="relative flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-500">
            <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a2 2 0 01-2-2h4a2 2 0 01-2 2z" fill="currentColor" />
          </svg>
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-alert opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-alert"></span>
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-slate-600 hidden sm:inline">Alertas</span>
        {alertsCount > 0 && (
          <span className="bg-status-alert/10 text-status-alert border border-status-alert/40 text-[9px] font-extrabold px-1.5 py-0.5 leading-none flex items-center justify-center min-w-[16px] h-4">
            {alertsCount}
          </span>
        )}
      </button>

      {/* menu del usuario*/}
      {user && (
        <div className="relative flex-shrink-0" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 transition-colors duration-150 select-none ${userMenuOpen ? "bg-kanan-100 ring-1 ring-kanan-300" : "bg-slate-100 hover:bg-slate-200"
              }`}
          >
            <div className="w-6 h-6 bg-kanan-100 flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4.5" r="2.2" stroke="#2333ce" strokeWidth="1.2" />
                <path d="M1.5 11.5c0-2.2 2.24-3.5 5-3.5s5 1.3 5 3.5" stroke="#2333ce" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none gap-0.5 text-left">
              <span className="text-xs font-semibold text-kanan-800">{user.nombre}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 w-fit ${ROLE_BADGE[user.rol] ?? "bg-slate-200 text-slate-500"}`}>
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
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-300 overflow-hidden z-50 animate-fade-in">
              <CardCorners />

              {/* Info usuario */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-300">
                <p className="text-xs font-bold text-kanan-900 truncate">{user.nombre}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email ?? ""}</p>
              </div>

              {/* Acciones */}
              {(canAddUser || canConfigNodes || canAddNode) && (
                <div className="px-2 py-2 flex flex-col gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1.5">Administración</p>

                  {/* Nuevo usuario */}
                  {canAddUser && (
                    <button
                      onClick={() => handleUserAction(onAddUser)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-kanan-100 cursor-pointer"
                    >
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-violet-100">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="5.5" cy="4.5" r="2" stroke="#7c3aed" strokeWidth="1.3" />
                          <path d="M1.5 11.5c0-2 1.8-3.5 4-3.5" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M10 8v4M8 10h4" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          Nuevo usuario
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Crear cuenta y asignar rol</p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Cerrar sesión */}
              <div className="px-2 pb-2 border-t border-slate-300 pt-2">
                <button
                  onClick={() => { setUserMenuOpen(false); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-status-alert/10 transition-colors duration-150 group"
                >
                  <div className="w-8 h-8 bg-status-alert/10 flex items-center justify-center flex-shrink-0 group-hover:bg-status-alert/20">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9.5 9.5l3-2.5-3-2.5M12.5 7H5"
                        stroke="#b03a2b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-status-alert">Cerrar sesión</p>
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
          <div className="relative bg-white border border-slate-300 p-6 w-full max-w-xs mx-4 transform transition-all">
            <CardCorners color="border-status-alert" />
            <div className="w-14 h-14 bg-status-alert/10 text-status-alert flex items-center justify-center mb-4 mx-auto">
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
                className="flex-1 flex items-center justify-center px-4 py-2.5 bg-status-alert text-white text-xs font-semibold uppercase tracking-wider hover:bg-status-alert/90 transition-colors"
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
