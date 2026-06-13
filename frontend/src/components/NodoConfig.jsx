import { useState, useEffect } from "react";
import { editarNodo, eliminarNodo, fetchUmbralesDeNodo, editarUmbralesDeNodo } from "../api";

const STATUS_DOT = {
  activo: "#1a8a55",
  alerta: "#ef4444",
  inactivo: "#94a3b8",
};

const DEFAULTS = {
  ph: { valor_min: 6.5, valor_max: 8.5 },
  turbidez: { valor_min: 0, valor_max: 5 },
  conductividad: { valor_min: 0, valor_max: 1500 },
  temperatura: { valor_min: 0, valor_max: 40 },
  tds: { valor_min: 0, valor_max: 1000 }
};

export default function NodoConfig({ nodes, onClose, onNodesChanged }) {
  const [selected, setSelected] = useState(nodes[0] ?? null);
  const [form, setForm] = useState({ ubicacion: "", version_fw: "", activo: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deletedNodeName, setDeletedNodeName] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [umbralesForm, setUmbralesForm] = useState(DEFAULTS);

  useEffect(() => {
    if (!selected) return;
    setForm({
      ubicacion: selected.ubicacion ?? "",
      version_fw: selected.version_firmware ?? "",   // buildNode usa version_firmware
      activo: selected.status !== "inactivo",    // buildNode no guarda activo, usa status
    });
    setMsg(null);
    setConfirmDelete(false);
    setDeleting(false); // Reset deleting state on selection change

    // Cargar umbrales desde el backend
    const loadUmbrales = async () => {
      try {
        const data = await fetchUmbralesDeNodo(selected.id);
        const map = {};
        Object.keys(DEFAULTS).forEach((k) => {
          map[k] = {
            valor_min: data.umbrales?.[k]?.valor_min ?? DEFAULTS[k].valor_min,
            valor_max: data.umbrales?.[k]?.valor_max ?? DEFAULTS[k].valor_max,
          };
        });
        setUmbralesForm(map);
      } catch (err) {
        // Fallback a umbrales locales o constantes por defecto
        const map = {};
        Object.keys(DEFAULTS).forEach((k) => {
          map[k] = {
            valor_min: selected.umbrales?.[k]?.valor_min ?? DEFAULTS[k].valor_min,
            valor_max: selected.umbrales?.[k]?.valor_max ?? DEFAULTS[k].valor_max,
          };
        });
        setUmbralesForm(map);
      }
    };
    loadUmbrales();
  }, [selected?.id]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await editarNodo(selected.id, {
        ubicacion: form.ubicacion.trim() || undefined,
        version_fw: form.version_fw.trim() || undefined,
        activo: form.activo,
      });
      
      // Guardar umbrales individuales
      await editarUmbralesDeNodo(selected.id, umbralesForm);

      setMsg({ type: "ok", text: "Nodo y umbrales actualizados correctamente." });
      onNodesChanged?.({
        ...res.nodo,
        umbrales: umbralesForm
      });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    setMsg(null);
    try {
      await eliminarNodo(selected.id);
      setDeletedNodeName(selected.node_id);
      
      // Show success modal (do not notify parent yet to avoid immediate unmounting if it is the last node)
      setShowSuccessModal(true);
      
      // Reset flags so it doesn't get locked up
      setDeleting(false);
      setConfirmDelete(false);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
      setDeleting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // Notify parent to remove the deleted node from state
    onNodesChanged?.(null, selected.id); // null = deleted
    
    // Find remaining nodes relative to the deleted one
    const remaining = nodes.filter((n) => n.id !== selected.id);
    if (remaining.length > 0) {
      setSelected(remaining[0]);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-2xl mx-4" style={{ maxHeight: "85vh" }}>

          {/*lista de nodos*/}
          <div className="w-52 flex-shrink-0 bg-slate-50 border-r border-slate-100 flex flex-col">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-buap-900">Configurar nodos</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">{nodes.length} nodo{nodes.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {nodes.map((node) => {
                const isSel = node.id === selected?.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelected(node)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all mb-1 ${isSel
                        ? "bg-white shadow-sm ring-1 ring-inset ring-buap-200"
                        : "hover:bg-white/70"
                      }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: STATUS_DOT[node.status] ?? "#94a3b8" }}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSel ? "text-buap-800" : "text-slate-700"}`}>
                        {node.node_id}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{node.ubicacion}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* edicion*/}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Header del panel */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-buap-900">{selected?.node_id ?? "—"}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selected?.mac ?? ""}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {selected ? (
              <div className="flex-1 px-6 py-5 flex flex-col gap-5">

                {/* ubicacion */}
                <div className="flex flex-col gap-1.5">
                  <label className="label-sm" htmlFor="cfg-ubicacion">Ubicación</label>
                  <input
                    id="cfg-ubicacion"
                    type="text"
                    value={form.ubicacion}
                    onChange={set("ubicacion")}
                    className="input-base"
                    placeholder="Ej. Bebedero norte — Edificio CAD"
                  />
                </div>

                {/* switch */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Nodo activo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {form.activo ? "El nodo envía telemetría y genera alertas." : "El nodo está deshabilitado y no procesará lecturas."}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${form.activo ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.activo ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {/* Opciones avanzadas (Umbrales personalizados) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700">Opciones avanzadas</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Configurar firmware y umbrales de alerta</p>
                    </div>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-slate-400 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {showAdvanced && (
                    <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-4 animate-fade-in">
                      {/* Versión firmware */}
                      <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-100">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide" htmlFor="cfg-fw">
                          Versión firmware
                          <span className="ml-1.5 text-[10px] font-normal text-slate-400 font-sans lowercase">(opcional)</span>
                        </label>
                        <input
                          id="cfg-fw"
                          type="text"
                          value={form.version_fw}
                          onChange={set("version_fw")}
                          className="input-base font-mono h-8.5 py-1.5 text-xs bg-slate-50/50"
                          placeholder="1.0.0"
                        />
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                          Configurar Umbrales de Alerta
                        </p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Modifica los valores límites de alerta específicos para este nodo. Si el valor de un parámetro sale de este rango, se detonará una alerta inmediata.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {Object.entries(umbralesForm).map(([param, limites]) => {
                          const labels = {
                            ph: { label: "pH", unit: "" },
                            temperatura: { label: "Temperatura", unit: "°C" },
                            conductividad: { label: "Conductividad", unit: "µS/cm" },
                            turbidez: { label: "Turbidez", unit: "NTU" },
                            tds: { label: "TDS", unit: "mg/L" }
                          };
                          const pInfo = labels[param] || { label: param, unit: "" };
                          return (
                            <div key={param} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
                              <div className="min-w-[120px]">
                                <p className="text-xs font-semibold text-slate-700">{pInfo.label}</p>
                                {pInfo.unit && <p className="text-[9px] text-slate-400 font-mono">{pInfo.unit}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Mín:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={limites.valor_min}
                                    onChange={(e) => setUmbralesForm(prev => ({
                                      ...prev,
                                      [param]: { ...prev[param], valor_min: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-20 input-base text-xs text-center py-1 px-1.5 h-8 font-mono"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Máx:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={limites.valor_max}
                                    onChange={(e) => setUmbralesForm(prev => ({
                                      ...prev,
                                      [param]: { ...prev[param], valor_max: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-20 input-base text-xs text-center py-1 px-1.5 h-8 font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mensaje de feedback */}
                {msg && (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border ${msg.type === "ok"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-600"
                    }`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      {msg.type === "ok"
                        ? <><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></>
                        : <><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /><line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="7" cy="10" r="0.8" fill="currentColor" /></>
                      }
                    </svg>
                    {msg.text}
                  </div>
                )}

                {/*boton de guardar */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary justify-center"
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    : "Guardar cambios"
                  }
                </button>

                {/* danger zone */}
                <div className="border border-red-200 rounded-xl p-4 mt-2">
                  <p className="text-xs font-bold text-red-600 mb-1">Zona de peligro</p>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    Eliminar este nodo borrará permanentemente su configuración y todos sus umbrales.
                    La telemetría histórica en MongoDB se conserva.
                  </p>

                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 3h9M5 3V2h3v1M4 3v7.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      Eliminar nodo
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 animate-fade-in">
                      <p className="text-xs font-semibold text-red-700">
                        ¿Estás seguro? Esta acción no se puede deshacer.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="btn-ghost flex-1 justify-center text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all"
                        >
                          {deleting
                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                            : "Confirmar eliminación"
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Selecciona un nodo de la lista
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4 flex flex-col items-center text-center border border-slate-100 animate-fade-in">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 ring-8 ring-emerald-50/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-buap-900 mb-1">
              ¡Nodo eliminado!
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              El nodo <span className="font-semibold text-slate-700 font-mono">{deletedNodeName}</span> se ha eliminado correctamente del sistema.
            </p>
            <button
              onClick={handleCloseSuccessModal}
              className="w-full btn-primary justify-center text-xs py-2.5"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
