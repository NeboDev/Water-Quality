import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import ParameterCard from "./components/ParameterCard";
import NodeMap from "./components/NodeMap";
import StatusBar from "./components/StatusBar";
import Login from "./components/Login";
import Register from "./components/Register";
import ExpandedChart from "./components/ExpandedChart";
import NodoForm from "./components/NodoForm";
import UsuarioForm from "./components/UsuarioForm";
import NodoConfig from "./components/NodoConfig";
import GlobalAlertsDrawer from "./components/GlobalAlertsDrawer";
import Overview from "./components/Overview";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { buildNode, buildHistory, telemetryToPoint, PARAMS } from "./constants";
import { fetchNodos, fetchTelemetria, fetchAlertas, resolverAlerta } from "./api";
import { io } from "socket.io-client";
import { usePermissions } from "./hooks/usePermissions";

const SESSION_KEY = "aquamonitor_session";
const HISTORY_LIMIT = 24; // samples shown in dashboard cards
let socket = null;

// ── Screens ──────────────────────────────────────────
function LoadingScreen({ message = "Cargando…" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-11 h-11 rounded-full border-2 border-buap-200 border-t-buap-700 animate-spin-slow" />
        <p className="text-sm text-slate-500 font-medium">{message}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="card p-8 max-w-sm w-full text-center shadow-card-lg">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="#dc2626" strokeWidth="1.5" />
            <line x1="11" y1="7" x2="11" y2="12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="15.5" r="1.2" fill="#dc2626" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">No se pudo cargar</p>
        <p className="text-xs text-slate-400 mb-5">{message}</p>
        <button onClick={onRetry} className="btn-primary justify-center w-full">Reintentar</button>
      </div>
    </div>
  );
}

// Decodifica el payload del JWT (sin verificar firma, solo lectura de claims)
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch { return {}; }
}

// ── Main App ──────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s) return null;
      // Siempre enriquecer user.rol desde el propio token JWT
      const claims = decodeJwt(s.token);
      return { ...s, user: { ...s.user, rol: claims.rol ?? s.user?.rol } };
    } catch { return null; }
  });
  const [screen, setScreen] = useState("login");

  // Nodes state
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState("overview");

  // Loading states
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [nodesError, setNodesError] = useState("");

  // Expanded chart modal
  const [expandedParam, setExpandedParam] = useState(null); // param key or null
  const [showNodoForm, setShowNodoForm] = useState(false);
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);
  const [showNodoConfig, setShowNodoConfig] = useState(false);

  // Global Alerts
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);

  // Ref para acceder a los nodos actuales desde dentro del socket (evita closures stale)
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // ── Auth ────────────────────────────────────────────
  const handleLogin = (token, user) => {
    // Enriquecer con el rol que viene firmado en el JWT (fuente de verdad)
    const claims = decodeJwt(token);
    const enrichedUser = { ...user, rol: claims.rol ?? user?.rol };
    const s = { token, user: enrichedUser };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setAuth(s);
  };
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    if (socket) socket.disconnect();
    setAuth(null);
    setNodes([]);
    setSelectedNode(null);
    setScreen("login");
  };

  // ── Load all nodes ──────────────────────────────────
  const loadNodes = useCallback(async (token) => {
    setLoadingNodes(true);
    setNodesError("");
    try {
      const nodosData = await fetchNodos(token);
      const built = nodosData.map((n) => buildNode(n));
      setNodes(built);
      return built;
    } catch (err) {
      setNodesError(err.message || "Error al cargar nodos.");
      return [];
    } finally {
      setLoadingNodes(false);
    }
  }, []);

  // ── Load telemetry for one node (updates nodes array only, no selectedNode) ──
  const loadTelemetrySilent = useCallback(async (token, node) => {
    try {
      const telemetry = await fetchTelemetria(token, node.id);
      if (!telemetry || telemetry.length === 0) {
        const noData = { ...node, valores: null, timestamp: null, history: null, fullHistory: null, sinDatos: true };
        setNodes((prev) => prev.map((n) => n.id === node.id ? noData : n));
        return noData;
      }
      const fullHistory = buildHistory(telemetry);
      const history = buildHistory(telemetry, HISTORY_LIMIT);
      const latest = telemetry[0];
      const updated = { ...node, valores: { ...latest.valores }, timestamp: latest.timestamp ?? null, history, fullHistory, sinDatos: false };
      setNodes((prev) => prev.map((n) => n.id === node.id ? updated : n));
      return updated;
    } catch (err) {
      console.error(`Error cargando telemetría [${node.id}]:`, err.message);
      const errNode = { ...node, sinDatos: true, errorTelemetria: err.message };
      setNodes((prev) => prev.map((n) => n.id === node.id ? errNode : n));
      return errNode;
    }
  }, []);

  // ── Load telemetry for one node (updates selectedNode too) ───────────────────
  const loadTelemetry = useCallback(async (token, node) => {
    setLoadingTelemetry(true);
    try {
      const updated = await loadTelemetrySilent(token, node);
      setSelectedNode(updated);
    } finally {
      setLoadingTelemetry(false);
    }
  }, [loadTelemetrySilent]);

  // ── WebSockets: listen for realtime telemetry ────────────────
  useEffect(() => {
    if (!auth?.token) return;

    socket = io("http://localhost:3000");

    socket.on("telemetria:live", (latest) => {
      const newPoint = (param) => telemetryToPoint(latest, param);

      setNodes((prev) => prev.map((n) => {
        if (n.id !== latest.nodo_id || !n.history) return n;
        const newHistory = {};
        const newFull = {};
        PARAMS.forEach((p) => {
          const pt = newPoint(p);
          newHistory[p] = [...n.history[p].slice(1), pt];
          newFull[p] = [...(n.fullHistory?.[p] ?? []), pt];
        });
        return {
          ...n,
          valores: { ...latest.valores },
          timestamp: latest.timestamp,
          history: newHistory,
          fullHistory: newFull,
        };
      }));

      setSelectedNode((prev) => {
        if (!prev || prev.id !== latest.nodo_id) return prev;
        const newHistory = {};
        const newFull = {};
        PARAMS.forEach((p) => {
          const pt = newPoint(p);
          newHistory[p] = [...(prev.history?.[p] ?? []).slice(1), pt];
          newFull[p] = [...(prev.fullHistory?.[p] ?? []), pt];
        });
        return {
          ...prev,
          valores: { ...latest.valores },
          timestamp: latest.timestamp,
          history: newHistory,
          fullHistory: newFull,
        };
      });
    });

    socket.on("alertas:nueva", (payload) => {
      // Enriquecer la alerta con ubicacion desde el estado local de nodos
      const nodoLocal = nodesRef.current.find(n => n.id === payload.nodo_id);
      const alertaEnriquecida = {
        ...payload.alerta,
        nodo_id: payload.nodo_id,
        ubicacion: payload.alerta.ubicacion || nodoLocal?.ubicacion || nodoLocal?.node_id || payload.mac,
      };
      setGlobalAlerts((prev) => [alertaEnriquecida, ...prev]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [auth?.token]);

  // ── On auth: load nodes, then telemetry for ALL nodes in parallel ──
  useEffect(() => {
    if (!auth?.token) return;

    loadNodes(auth.token).then((built) => {
      if (built.length === 0) return;
      // Load all nodes silently in parallel, then set the first as selected
      Promise.all(built.map((n) => loadTelemetrySilent(auth.token, n))).then((results) => {
        const first = results[0];
        if (first) setSelectedNode(first);
      });
    });

    fetchAlertas(auth.token, { resuelta: false }).then(setGlobalAlerts).catch(console.error);
  }, [auth]);

  // ── When selected node changes: load its telemetry ──
  const prevSelectedId = useRef(null);
  useEffect(() => {
    if (!auth?.token || !selectedNode?.id) return;
    if (selectedNode.id === prevSelectedId.current) return; // already loaded
    if (selectedNode.history) return; // already have it
    prevSelectedId.current = selectedNode.id;
    loadTelemetry(auth.token, selectedNode);
  }, [selectedNode?.id]);

  // ── Permisos basados en rol ──────────────────────────
  const permissions = usePermissions(auth?.user?.rol);

  // ── Screens without auth ───────────────────────────
  if (!auth && screen === "register") {
    return (
      <Register
        onRegister={() => {
          setScreen("login");
        }}
        onGoLogin={() => setScreen("login")}
      />
    );
  }
  if (!auth) return <Login onLogin={handleLogin} onGoRegister={() => setScreen("register")} />;
  if (loadingNodes) return <LoadingScreen message="Cargando nodos…" />;
  if (nodesError) return <ErrorScreen message={nodesError} onRetry={() => loadNodes(auth.token)} />;

  // ── Helpers ────────────────────────────────────────
  const handleSelectNode = (node) => {
    if (node.id === selectedNode?.id) return;
    prevSelectedId.current = null; // allow reload
    setSelectedNode(node);
    setView("dashboard");
  };

  const nodeReady = selectedNode?.valores && selectedNode?.history;

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header
        nodes={nodes}
        selectedNode={selectedNode}
        onSelectNode={handleSelectNode}
        view={view}
        onViewChange={setView}
        user={auth?.user}
        onLogout={handleLogout}
        canAddNode={permissions.canManageNodes}
        onAddNode={() => setShowNodoForm(true)}
        canAddUser={permissions.canManageUsers}
        onAddUser={() => setShowUsuarioForm(true)}
        canConfigNodes={permissions.canManageNodes}
        onConfigNodes={() => setShowNodoConfig(true)}
        globalAlerts={globalAlerts}
        setShowGlobalAlerts={setShowGlobalAlerts}
      />

      <main className="flex-1 flex gap-5 p-5 overflow-hidden animate-fade-in">
        {view === "dashboard" && (
          <>
            {/* Loading telemetry */}
            {loadingTelemetry && !nodeReady && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-buap-200 border-t-buap-700 animate-spin-slow" />
                  <p className="text-xs text-slate-400">Cargando telemetría…</p>
                </div>
              </div>
            )}

            {/* No data / error state */}
            {!loadingTelemetry && selectedNode?.sinDatos && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 max-w-xs text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="8" width="24" height="18" rx="3" stroke="#94a3b8" strokeWidth="1.5" />
                      <path d="M10 14h12M10 19h7" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="24" cy="8" r="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
                      <path d="M22.5 8h3M24 6.5v3" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Sin datos disponibles
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {selectedNode.errorTelemetria
                        ? `Error: ${selectedNode.errorTelemetria}`
                        : "Este nodo aún no tiene registros de telemetría. Los datos aparecerán aquí en cuanto el dispositivo comience a enviar lecturas."}
                    </p>
                  </div>
                  <button
                    onClick={() => loadTelemetry(auth.token, selectedNode)}
                    className="btn-ghost text-xs border border-slate-200"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5a4.5 4.5 0 014.5-4.5A4.5 4.5 0 0111 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M9.5 4.5L11 6.5l2-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Reintentar
                  </button>
                </div>
              </div>
            )}


            {nodeReady && (
              <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[minmax(0,1fr)]">
                  {PARAMS.filter(p => p !== 'conductividad').map((p) => (
                    <ParameterCard
                      key={p}
                      param={p}
                      history={selectedNode.history[p]}
                      currentValue={selectedNode.valores[p]}
                      onExpand={() => setExpandedParam(p)}
                      disabled={selectedNode.status === "inactivo"}
                    />
                  ))}

                  <div className="lg:col-span-2 xl:col-span-2 h-full">
                    <ParameterCard
                      param="conductividad"
                      history={selectedNode.history.conductividad}
                      currentValue={selectedNode.valores.conductividad}
                      onExpand={() => setExpandedParam("conductividad")}
                      disabled={selectedNode.status === "inactivo"}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === "overview" && (
          <Overview
            nodes={nodes}
            globalAlerts={globalAlerts}
            canResolve={permissions.canResolveAlerts}
            onSelectNode={(node) => {
              if (node.id !== selectedNode?.id) {
                prevSelectedId.current = null;
                setSelectedNode(node);
              }
              setView("dashboard");
            }}
            onResolveAlert={async (id) => {
              try {
                await resolverAlerta(auth.token, id);
                setGlobalAlerts(prev => prev.filter(a => a.id !== id));
              } catch(e) {
                console.error(e);
              }
            }}
          />
        )}

        {view === "map" && (
          <NodeMap
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={(node) => {
              setSelectedNode(node);
              if (!node.history || !node.valores) {
                loadTelemetry(auth.token, node);
              }
            }}
            isAdmin={permissions.canEditMap}
          />
        )}
      </main>


      {/* Expanded chart modal */}
      {expandedParam && selectedNode && (
        <ExpandedChart
          param={expandedParam}
          token={auth.token}
          nodeId={selectedNode.id}
          nodeName={selectedNode.node_id}
          latestTimestamp={selectedNode.timestamp}
          onClose={() => setExpandedParam(null)}
          disabled={selectedNode.status === "inactivo"}
        />
      )}

      {/* Registrar nuevo nodo — solo admin */}
      {showNodoForm && (
        <NodoForm
          token={auth.token}
          onSuccess={(nuevoNodo) => {
            setNodes((prev) => [...prev, buildNode(nuevoNodo)]);
            setShowNodoForm(false);
          }}
          onClose={() => setShowNodoForm(false)}
        />
      )}

      {/* Crear usuario — solo admin */}
      {showUsuarioForm && (
        <UsuarioForm
          token={auth.token}
          onSuccess={() => setShowUsuarioForm(false)}
          onClose={() => setShowUsuarioForm(false)}
        />
      )}

      {/* Configuración de nodos — solo admin */}
      {showNodoConfig && nodes.length > 0 && (
        <ErrorBoundary>
          <NodoConfig
            token={auth.token}
            nodes={nodes}
            onClose={() => setShowNodoConfig(false)}
            onNodesChanged={(nodoActualizado, idEliminado) => {
              if (idEliminado) {
                // Nodo eliminado — quitarlo de la lista
                setNodes((prev) => prev.filter((n) => n.id !== idEliminado));
                if (selectedNode?.id === idEliminado) setSelectedNode(null);
              } else if (nodoActualizado) {
                // Nodo editado — actualizar en la lista
                setNodes((prev) =>
                  prev.map((n) =>
                    n.id === nodoActualizado.id
                      ? {
                          ...n,
                          ubicacion: nodoActualizado.ubicacion,
                          version_firmware: nodoActualizado.version_fw,
                          // Recalcular status desde el boolean activo del backend
                          status: nodoActualizado.activo ? "activo" : "inactivo",
                        }
                      : n
                  )
                );
              }
            }}
          />
        </ErrorBoundary>
      )}

      {/* Global Alerts Drawer */}
      {showGlobalAlerts && (
        <GlobalAlertsDrawer
          alerts={globalAlerts}
          nodes={nodes}
          onClose={() => setShowGlobalAlerts(false)}
          canResolve={permissions.canResolveAlerts}
          onResolve={async (id) => {
            try {
              await resolverAlerta(auth.token, id);
              setGlobalAlerts(prev => prev.filter(a => a.id !== id));
            } catch(e) {
              console.error(e);
            }
          }}
          onResolveAll={async () => {
            try {
              await Promise.all(globalAlerts.map(a => resolverAlerta(auth.token, a.id)));
              setGlobalAlerts([]);
            } catch(e) {
              console.error(e);
            }
          }}
        />
      )}
    </div>
  );
}
