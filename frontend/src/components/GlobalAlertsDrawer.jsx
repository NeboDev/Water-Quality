import { useEffect } from "react";
import { NOM_127_LIMITS, PARAM_COLORS } from "../constants";

export default function GlobalAlertsDrawer({ alerts, nodes, onClose, onResolve, onResolveAll, canResolve }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[110] flex flex-col transform transition-transform duration-300 animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a2 2 0 01-2-2h4a2 2 0 01-2 2z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-buap-900 leading-tight">Alertas activas</h2>
              <p className="text-xs text-slate-400 mt-0.5">{alerts.length} sin resolver</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-medium">No hay alertas activas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alerta) => {
                const limits = NOM_127_LIMITS[alerta.parametro];
                const color = PARAM_COLORS[alerta.parametro];
                const diff = alerta.valor_leido > alerta.valor_max
                  ? `+${(alerta.valor_leido - alerta.valor_max).toFixed(2)}`
                  : `-${(alerta.valor_min - alerta.valor_leido).toFixed(2)}`;

                const location = alerta.ubicacion || nodes?.find(n => n.id === alerta.nodo_id)?.ubicacion || "Nodo desconocido";

                return (
                  <div key={alerta.id} className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <p className="text-sm font-bold text-buap-900 leading-none">
                            {limits?.label || alerta.parametro}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {location}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(alerta.creado_en).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">Lectura anómala</p>
                        <p className="font-mono text-xl font-bold text-red-500 leading-none">
                          {alerta.valor_leido}
                          <span className="text-xs font-normal text-slate-400 ml-1">{limits?.unit || ""}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 mb-0.5">Límite NOM-127</p>
                        <p className="text-xs font-semibold text-slate-600">
                          {alerta.valor_leido > alerta.valor_max ? alerta.valor_max : alerta.valor_min}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-md">
                        {diff} {limits?.unit}
                      </span>
                      
                      {canResolve && (
                        <button
                          onClick={() => onResolve(alerta.id)}
                          className="text-xs font-semibold text-buap-600 hover:text-buap-800 transition-colors"
                        >
                          Marcar resuelta
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && canResolve && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={onResolveAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-buap-50 text-buap-700 hover:bg-buap-100 font-semibold rounded-xl transition-colors text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9l3 3 7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Marcar todo como resuelto
            </button>
          </div>
        )}
      </div>
    </>
  );
}
