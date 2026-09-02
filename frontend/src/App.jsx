import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Landing from "./pages/Landing";
import Header from "./components/Header";
import NodeMap from "./pages/NodeMap";
import StatusBar from "./components/StatusBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MultiNodeExpandedChart from "./components/MultiNodeExpandedChart";
import NodoForm from "./components/NodoForm";
import UsuarioForm from "./components/UsuarioForm";
import NodoConfig from "./components/NodoConfig";
import MuestraModal from "./components/MuestraModal";
import GlobalAlertsDrawer from "./components/GlobalAlertsDrawer";
import Overview from "./pages/Overview";
import Reportes from "./pages/Reportes";
import NodosView from "./pages/NodosView";
import NodeDetailModal from "./components/NodeDetailModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { buildNode, buildHistory, telemetryToPoint, PARAMS } from "./constants";
import { fetchNodos, fetchUmbrales, fetchTelemetria, fetchAlertas, resolverAlerta, logout as apiLogout } from "./api";
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
        <div className="w-11 h-11 rounded-full border-2 border-kanan-200 border-t-kanan-700 animate-spin-slow" />
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Nodes state
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState("overview");

  // Conexion de socket en tiempo real (indicador en el Header)
  const [socketConnected, setSocketConnected] = useState(false);

  // Modal de detalle de nodo (vista Nodos) — sincronizado con ?nodo=<id>
  const [modalNodeId, setModalNodeId] = useState(null);

  // Loading states
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [initializingTelemetry, setInitializingTelemetry] = useState(false);
  const [nodesError, setNodesError] = useState("");

  // Expanded chart modal
  const [expandedOverviewParam, setExpandedOverviewParam] = useState(null);
  const [showNodoForm, setShowNodoForm] = useState(false);
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);
  const [showNodoConfig, setShowNodoConfig] = useState(false);
  const [showMuestraModal, setShowMuestraModal] = useState(null);
  // Incrementa al registrar una muestra — NodeDetailModal lo usa para invalidar su caché de "Muestras oficiales"
  const [muestraVersion, setMuestraVersion] = useState(0);

  // Global Alerts
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);
  const [alertsFilterNodeId, setAlertsFilterNodeId] = useState(null);

  const handleOpenAlerts = (nodeId = null) => {
    setAlertsFilterNodeId(nodeId);
    setShowGlobalAlerts(true);
  };

  const handleSetShowGlobalAlerts = (val) => {
    if (val) setAlertsFilterNodeId(null);
    setShowGlobalAlerts(val);
  };

  // Advertencia de inactividad de sesión (29 mins)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60);

  // Ref para acceder a los nodos actuales desde dentro del socket (evita closures stale)
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // ── Auth ────────────────────────────────────────────
  const handleLogin = (user) => {
    const s = { user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setView("overview"); // siempre aterrizar en Vista General al iniciar sesión
    setAuth(s);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    //Invalidar la cookie HttpOnly en el servidor 
    try { await apiLogout(); } catch { /* si falla el request, continuamos igual */ }
    //limpiar estado local
    sessionStorage.removeItem(SESSION_KEY);
    if (socket) { socket.disconnect(); socket = null; }
    setAuth(null);
    setNodes([]);
    setSelectedNode(null);
    setGlobalAlerts([]);
    setView("overview"); // resetear para la próxima sesión
    navigate("/");
  };

  // cargar todos los nodos
  const loadNodes = useCallback(async () => {
    setLoadingNodes(true);
    setNodesError("");
    try {
      const [nodosData, umbralesData] = await Promise.all([
        fetchNodos(),
        fetchUmbrales().catch(() => []) // Fallback in case of database sync latency or restricted permissions
      ]);
      const built = nodosData.map((n) => {
        const matchingUmbrales = umbralesData.find((u) => u.nodo_id === n.id);
        return buildNode(n, matchingUmbrales?.umbrales);
      });
      setNodes(built);
      return built;
    } catch (err) {
      setNodesError(err.message || "Error al cargar nodos.");
      return [];
    } finally {
      setLoadingNodes(false);
    }
  }, []);

  // Load telemetry for one node (updates nodes array only, no selectedNode)
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

  // Load telemetry for one node (updates selectedNode too)
  const loadTelemetry = useCallback(async (node) => {
    const updated = await loadTelemetrySilent(node);
    setSelectedNode(updated);
  }, [loadTelemetrySilent]);

  //  WebSockets: listen for realtime telemetry 
  useEffect(() => {
    if (!auth?.user) return;

    // Sin VITE_SOCKET_URL, socket.io-client conecta al mismo origen que sirvió la página (pasa por el proxy de nginx)
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined);

    // Estado real de la conexión — refleja el indicador del Header
    setSocketConnected(socket.connected);
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    // reconnect_attempt/reconnect son eventos del Manager (socket.io-client v4), no del socket
    socket.io.on("reconnect_attempt", () => setSocketConnected(false));
    socket.io.on("reconnect", () => setSocketConnected(true));

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

    // Una alerta resuelta en cualquier sesión debe reflejarse aquí sin refrescar
    socket.on("alertas:resuelta", (payload) => {
      setGlobalAlerts((prev) => prev.filter((a) => a.id !== payload.alerta.id));
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [auth?.user]);

  //  On auth: load nodes, then telemetry for ALL nodes in parallel 
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

  //  When selected node changes: load its telemetry 
  const prevSelectedId = useRef(null);
  useEffect(() => {
    if (!auth?.user || !selectedNode?.id) return;
    if (selectedNode.id === prevSelectedId.current) return; // already loaded
    if (selectedNode.history) return; // already have it
    prevSelectedId.current = selectedNode.id;
    loadTelemetry(selectedNode);
  }, [selectedNode?.id]);

  // Monitoreo de inactividad de sesión (Timeout de 30 mins) 
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!auth) {
      setShowTimeoutWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      if (!showTimeoutWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity));

    // Revisar el estado de inactividad cada 5 segundos
    const interval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      const WARNING_TIME = 29 * 60 * 1000; // Advertencia a los 29 minutos
      const LOGOUT_TIME = 30 * 60 * 1000;  // Auto-cierre a los 30 minutos

      if (inactiveMs >= LOGOUT_TIME) {
        handleLogout();
        setShowTimeoutWarning(false);
      } else if (inactiveMs >= WARNING_TIME) {
        setShowTimeoutWarning(true);
      }
    }, 5000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
    };
  }, [auth, showTimeoutWarning]);

  // Manejo del contador regresivo en el modal de advertencia (60 segundos)
  useEffect(() => {
    if (!showTimeoutWarning) return;

    setTimeoutCountdown(60);

    const countdownTimer = setInterval(() => {
      setTimeoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          handleLogout();
          setShowTimeoutWarning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [showTimeoutWarning]);

  // Función para extender la sesión (llama a checkSession en el backend para refrescar la cookie)
  const handleExtendSession = async () => {
    try {
      await checkSession();
    } catch (e) {
      console.error("No se pudo extender la sesión en el servidor:", e);
    }
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  };

  // Auto-selección del único nodo registrado (para que "Métricas por nodo" no requiera elegirlo a mano)
  useEffect(() => {
    if (nodes.length === 1) {
      if (nodes[0] && (!selectedNode || selectedNode.id !== nodes[0].id)) {
        setSelectedNode(nodes[0]);
      }
    }
  }, [nodes, selectedNode?.id]);

  // permisos basados en roles
  const permissions = usePermissions(auth?.user?.rol);

  const handleSelectNode = (node) => {
    if (node.id === selectedNode?.id) return;
    prevSelectedId.current = null; // allow reload
    setSelectedNode(node);
    setView("nodos");
  };

  // ── Modal de detalle de nodo (vista Nodos) ──
  const openNodeModal = useCallback((node) => {
    setModalNodeId(node.id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("nodo", node.id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeNodeModal = useCallback(() => {
    setModalNodeId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("nodo");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Deep link: si la URL trae ?nodo=<id> y ese nodo ya cargó, abre el modal solo
  useEffect(() => {
    const paramId = searchParams.get("nodo");
    if (paramId && nodes.some((n) => n.id === paramId) && modalNodeId !== paramId) {
      setModalNodeId(paramId);
      setView("nodos");
    }
  }, [searchParams, nodes, modalNodeId]);

  // ── Enriquecer nodos con status dinámico ──
  const enrichedNodes = nodes.map(node => {
    if (node.status === "inactivo") return node;
    const hasUnresolvedAlert = globalAlerts?.some(a => a.nodo_id === node.id);
    if (hasUnresolvedAlert) {
      return { ...node, status: "alerta" };
    }
    return { ...node, status: "activo" };
  });

  const activeParams = PARAMS.filter((param) => {
    return enrichedNodes.some((node) => {
      if (!node || node.sinDatos) return false;
      const hasHistoryValue = node.history?.[param]?.some(
        (point) => point.value !== null && point.value !== undefined
      );
      const hasLatestValue = node.valores?.[param] !== null && node.valores?.[param] !== undefined;
      return hasHistoryValue || hasLatestValue;
    });
  });

  const enrichedSelectedNode = selectedNode ? enrichedNodes.find(n => n.id === selectedNode.id) || selectedNode : null;
  const modalNode = modalNodeId ? enrichedNodes.find(n => n.id === modalNodeId) || null : null;

  function renderDashboardScreen() {
    if (loadingNodes) return <LoadingScreen message="Cargando nodos…" />;
    if (nodesError) return <ErrorScreen message={nodesError} onRetry={() => loadNodes()} />;
    if (initializingTelemetry) return <LoadingScreen message="Sincronizando telemetría…" />;

    return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header
        nodes={enrichedNodes}
        selectedNode={enrichedSelectedNode}
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
        onOpenAlerts={handleOpenAlerts}
        socketConnected={socketConnected}
      />

      <main className="flex-1 flex gap-5 p-5 overflow-hidden animate-fade-in">
        {view === "nodos" && (
          <NodosView
            nodes={enrichedNodes}
            onOpenNode={openNodeModal}
            canAddNode={permissions.canManageNodes}
            onAddNode={() => setShowNodoForm(true)}
          />
        )}

        {view === "overview" && (
          <Overview
            nodes={enrichedNodes}
            globalAlerts={globalAlerts}
            canResolve={permissions.canResolveAlerts}
            onSelectNode={(node) => {
              if (node.id !== selectedNode?.id) {
                prevSelectedId.current = null;
                setSelectedNode(node);
              }
              setView("nodos");
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
            activeParams={activeParams}
            onOpenAlerts={handleOpenAlerts}
          />
        )}

        {view === "map" && (
          <NodeMap
            nodes={enrichedNodes}
            selectedNode={enrichedSelectedNode}
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
          <Reportes nodes={enrichedNodes} />
        )}
      </main>


      {/* Detalle de nodo (vista Nodos) */}
      {modalNode && (
        <NodeDetailModal
          key={modalNode.id}
          node={modalNode}
          onClose={closeNodeModal}
          canRecordSamples={permissions.canRecordSamples}
          onRegisterSample={(node) => setShowMuestraModal(node)}
          muestraVersion={muestraVersion}
        />
      )}

      {/* Multi-node comparative chart modal */}
      {expandedOverviewParam && (
        <MultiNodeExpandedChart
          param={expandedOverviewParam}
          nodes={enrichedNodes}
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
                        umbrales: nodoActualizado.umbrales || n.umbrales,
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
                      umbrales: nodoActualizado.umbrales || prev.umbrales,
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
          alerts={alertsFilterNodeId ? globalAlerts.filter(a => a.nodo_id === alertsFilterNodeId) : globalAlerts}
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
              const alertsToResolve = alertsFilterNodeId
                ? globalAlerts.filter(a => a.nodo_id === alertsFilterNodeId)
                : globalAlerts;
              await Promise.all(alertsToResolve.map(a => resolverAlerta(a.id)));
              setGlobalAlerts(prev => prev.filter(a => !alertsToResolve.some(r => r.id === a.id)));
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {/* Registro de Muestra Oficial ICUAP */}
      {showMuestraModal && (
        <MuestraModal
          node={showMuestraModal}
          onClose={() => setShowMuestraModal(null)}
          onSuccess={() => {
            setShowMuestraModal(null);
            setMuestraVersion((v) => v + 1);
          }}
        />
      )}

      {/* Modal Advertencia de Inactividad (Timeout de sesión) */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-slate-100 transform scale-100 transition-all duration-300">

            {/* Animated Warning Icon with pulses */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-amber-400 opacity-20"></span>
              <div className="relative w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4M12 16h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
              ¿Sigues ahí?
            </h3>

            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              Tu sesión está a punto de expirar debido a la inactividad. Se cerrará automáticamente en:
            </p>

            {/* Premium Countdown display */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <div className="bg-slate-100 rounded-xl px-4 py-2 border border-slate-200 shadow-sm min-w-[80px] text-center">
                <span className="font-mono text-xl font-extrabold text-amber-600">
                  {timeoutCountdown < 10 ? `0${timeoutCountdown}` : timeoutCountdown}
                </span>
                <span className="text-[9px] block font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  segundos
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-slate-800 transition-all select-none active:scale-[0.98]"
              >
                Cerrar sesión
              </button>
              <button
                onClick={handleExtendSession}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-kanan-700 text-white text-xs font-semibold hover:bg-kanan-800 transition-all shadow-md shadow-kanan-700/20 select-none active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={auth ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} onGoRegister={() => navigate("/register")} />}
      />
      <Route
        path="/register"
        element={
          auth ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Register onRegister={() => navigate("/login")} onGoLogin={() => navigate("/login")} />
          )
        }
      />
      <Route path="/dashboard" element={auth ? renderDashboardScreen() : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
