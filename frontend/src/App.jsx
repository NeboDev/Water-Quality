import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import ParameterCard from "./components/ParameterCard";
import NodeMap from "./pages/NodeMap";
import StatusBar from "./components/StatusBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ExpandedChart from "./components/ExpandedChart";
import MultiNodeExpandedChart from "./components/MultiNodeExpandedChart";
import NodoForm from "./components/NodoForm";
import UsuarioForm from "./components/UsuarioForm";
import NodoConfig from "./components/NodoConfig";
import GlobalAlertsDrawer from "./components/GlobalAlertsDrawer";
import Overview from "./pages/Overview";
import Reportes from "./pages/Reportes";
import SingleView from "./pages/SingleView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { buildNode, buildHistory, telemetryToPoint, PARAMS } from "./constants";
import { fetchNodos, fetchTelemetria, fetchAlertas, resolverAlerta, logout as apiLogout } from "./api";
import { io } from "socket.io-client";
import { usePermissions } from "./hooks/usePermissions";

const SESSION_KEY = "aquamonitor_session";
const HISTORY_LIMIT = 24; // samples shown in dashboard cards
let socket = null;

//  screens
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

// main app
export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s) return null;
      return s;
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
  const [initializingTelemetry, setInitializingTelemetry] = useState(false);
  const [nodesError, setNodesError] = useState("");

  // Expanded chart modal
  const [expandedParam, setExpandedParam] = useState(null); // param key or null
  const [expandedOverviewParam, setExpandedOverviewParam] = useState(null);
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
  const handleLogin = (user) => {
    const s = { user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setView("overview"); // siempre aterrizar en Vista General al iniciar sesión
    setAuth(s);
  };

  const handleLogout = async () => {
    // 1. Invalidar la cookie HttpOnly en el servidor (la única forma correcta)
    try { await apiLogout(); } catch { /* si falla el request, continuamos igual */ }
    // 2. Limpiar estado local
    sessionStorage.removeItem(SESSION_KEY);
    if (socket) { socket.disconnect(); socket = null; }
    setAuth(null);
    setNodes([]);
    setSelectedNode(null);
    setGlobalAlerts([]);
    setView("overview"); // resetear para la próxima sesión
    setScreen("login");
  };

  // ── Load all nodes ──────────────────────────────────
  const loadNodes = useCallback(async () => {
    setLoadingNodes(true);
    setNodesError("");
    try {
      const nodosData = await fetchNodos();
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
  const loadTelemetrySilent = useCallback(async (node) => {
    try {
      const telemetry = await fetchTelemetria(node.id);
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
  const loadTelemetry = useCallback(async (node) => {
    setLoadingTelemetry(true);
    try {
      const updated = await loadTelemetrySilent(node);
      setSelectedNode(updated);
    } finally {
      setLoadingTelemetry(false);
    }
  }, [loadTelemetrySilent]);

  // ── WebSockets: listen for realtime telemetry ────────────────
  useEffect(() => {
    if (!auth?.user) return;

    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000");

    socket.on("telemetria:live", (latest) => {
      const newPoint = (param) => telemetryToPoint(latest, param);

      setNodes((prev) => prev.map((n) => {
        if (n.id !== latest.nodo_id) return n;
        const newHistory = {};
        const newFull = {};
        PARAMS.forEach((p) => {
          const pt = newPoint(p);
          const currentHist = n.history?.[p] || [];
          // Keep up to HISTORY_LIMIT - 1 elements, then append the new one
          newHistory[p] = [...currentHist.slice(-(HISTORY_LIMIT - 1)), pt];
          newFull[p] = [...(n.fullHistory?.[p] || []), pt];
        });
        return {
          ...n,
          sinDatos: false,
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
          const currentHist = prev.history?.[p] || [];
          newHistory[p] = [...currentHist.slice(-(HISTORY_LIMIT - 1)), pt];
          newFull[p] = [...(prev.fullHistory?.[p] || []), pt];
        });
        return {
          ...prev,
          sinDatos: false,
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
  }, [auth?.user]);

  // ── On auth: load nodes, then telemetry for ALL nodes in parallel ──
  useEffect(() => {
    if (!auth?.user) return;

    setInitializingTelemetry(true);
    loadNodes().then((built) => {
      if (built.length === 0) {
        setInitializingTelemetry(false);
        return;
      }
      // Load all nodes silently in parallel, then set the first as selected
      Promise.all(built.map((n) => loadTelemetrySilent(n))).then((results) => {
        const first = results[0];
        if (first) setSelectedNode(first);
        setInitializingTelemetry(false);
      });
    });

    fetchAlertas({ resuelta: false }).then(setGlobalAlerts).catch(console.error);
  }, [auth]);

  // ── When selected node changes: load its telemetry ──
  const prevSelectedId = useRef(null);
  useEffect(() => {
    if (!auth?.user || !selectedNode?.id) return;
    if (selectedNode.id === prevSelectedId.current) return; // already loaded
    if (selectedNode.history) return; // already have it
    prevSelectedId.current = selectedNode.id;
    loadTelemetry(selectedNode);
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
  if (nodesError) return <ErrorScreen message={nodesError} onRetry={() => loadNodes()} />;
  if (initializingTelemetry) return <LoadingScreen message="Sincronizando telemetría…" />;

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
        canViewReports={permissions.canViewReports}
        globalAlerts={globalAlerts}
        setShowGlobalAlerts={setShowGlobalAlerts}
      />

      <main className="flex-1 flex gap-5 p-5 overflow-hidden animate-fade-in">
        {view === "dashboard" && (
          <SingleView
            loadingTelemetry={loadingTelemetry}
            nodeReady={nodeReady}
            selectedNode={selectedNode}
            setExpandedParam={setExpandedParam}
            loadTelemetry={loadTelemetry}
          />
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
                await resolverAlerta(id);
                setGlobalAlerts(prev => prev.filter(a => a.id !== id));
              } catch (e) {
                console.error(e);
              }
            }}
            onExpandParam={setExpandedOverviewParam}
          />
        )}

        {view === "map" && (
          <NodeMap
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={(node) => {
              setSelectedNode(node);
              if (!node.history || !node.valores) {
                loadTelemetry(node);
              }
            }}
            isAdmin={permissions.canEditMap}
          />
        )}

        {view === "reportes" && permissions.canViewReports && (
          <Reportes nodes={nodes} />
        )}
      </main>


      {/* Expanded chart modal */}
      {expandedParam && selectedNode && (
        <ExpandedChart
          param={expandedParam}
          nodeId={selectedNode.id}
          nodeName={selectedNode.node_id}
          latestTimestamp={selectedNode.timestamp}
          onClose={() => setExpandedParam(null)}
          disabled={selectedNode.status === "inactivo"}
        />
      )}

      {/* Multi-node comparative chart modal */}
      {expandedOverviewParam && (
        <MultiNodeExpandedChart
          param={expandedOverviewParam}
          nodes={nodes}
          onClose={() => setExpandedOverviewParam(null)}
        />
      )}

      {/* Registrar nuevo nodo — solo admin */}
      {showNodoForm && (
        <NodoForm
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
          onSuccess={() => setShowUsuarioForm(false)}
          onClose={() => setShowUsuarioForm(false)}
        />
      )}

      {/* Configuración de nodos — solo admin */}
      {showNodoConfig && nodes.length > 0 && (
        <ErrorBoundary>
          <NodoConfig
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
                // Asegurar que si el nodo editado es el que estamos viendo, también se actualice en pantalla
                setSelectedNode((prev) => {
                  if (prev && prev.id === nodoActualizado.id) {
                    return {
                      ...prev,
                      ubicacion: nodoActualizado.ubicacion,
                      version_firmware: nodoActualizado.version_fw,
                      status: nodoActualizado.activo ? "activo" : "inactivo",
                    };
                  }
                  return prev;
                });
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
              await resolverAlerta(id);
              setGlobalAlerts(prev => prev.filter(a => a.id !== id));
            } catch (e) {
              console.error(e);
            }
          }}
          onResolveAll={async () => {
            try {
              await Promise.all(globalAlerts.map(a => resolverAlerta(a.id)));
              setGlobalAlerts([]);
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}
    </div>
  );
}
