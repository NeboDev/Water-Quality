import ParameterCard from "../components/ParameterCard";

export default function SingleView({
  loadingTelemetry,
  nodeReady,
  selectedNode,
  setExpandedParam,
  loadTelemetry,
  activeParams = [],
  globalAlerts = [],
  onOpenAlerts
}) {
  const nodeAlertsCount = globalAlerts?.filter(a => a.nodo_id === selectedNode?.id).length || 0;

  return (
    <>
      {/* sin nodo seleccionado */}
      {!selectedNode && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor" />
            </svg>
            <p className="text-sm">Agrega un nodo para ver sus métricas.</p>
          </div>
        </div>
      )}

      {/* carga de la telemetria */}
      {loadingTelemetry && !nodeReady && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-buap-200 border-t-buap-700 animate-spin-slow" />
            <p className="text-xs text-slate-400">Cargando telemetría…</p>
          </div>
        </div>
      )}

      {/* estado sin datos o error en la carga */}
      {!loadingTelemetry && selectedNode?.sinDatos && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
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
              onClick={() => loadTelemetry(selectedNode)}
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
        <div className={`flex-1 flex flex-col w-full pr-2 pb-4 relative lg:h-full lg:min-h-0 min-h-0 ${
          activeParams.length <= 4
            ? "lg:overflow-hidden"
            : "overflow-y-auto custom-scrollbar"
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in h-full auto-rows-[240px] lg:auto-rows-[calc((100%-1.25rem)/2)]">
            {activeParams.map((p) => {
              return (
                <div key={p} className="h-full">
                  <ParameterCard
                    param={p}
                    history={selectedNode.history[p]}
                    currentValue={selectedNode.valores[p]}
                    onExpand={() => setExpandedParam(p)}
                    disabled={selectedNode.status === "inactivo"}
                  />
                </div>
              );
            })}
          </div>

        </div>
      )}
    </>
  );
}
