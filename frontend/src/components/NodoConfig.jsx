import { useState, useEffect } from "react";
import { editarNodo, eliminarNodo } from "../api";

const STATUS_DOT = {
  activo:   "#1a8a55",
  alerta:   "#ef4444",
  inactivo: "#94a3b8",
};

export default function NodoConfig({ nodes, onClose, onNodesChanged }) {
  const [selected, setSelected] = useState(nodes[0] ?? null);
  const [form, setForm] = useState({ ubicacion: "", version_fw: "", activo: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok"|"err", text }

  // Sync form when selected node changes
  useEffect(() => {
    if (!selected) return;
    setForm({
      ubicacion:  selected.ubicacion ?? "",
      version_fw: selected.version_firmware ?? "",   // buildNode usa version_firmware
      activo:     selected.status !== "inactivo",    // buildNode no guarda activo, usa status
    });
    setMsg(null);
    setConfirmDelete(false);
  }, [selected?.id]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await editarNodo(selected.id, {
        ubicacion:  form.ubicacion.trim() || undefined,
        version_fw: form.version_fw.trim() || undefined,
        activo:     form.activo,
      });
      setMsg({ type: "ok", text: "Nodo actualizado correctamente." });
      onNodesChanged?.(res.nodo);
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
      onNodesChanged?.(null, selected.id); // null = deleted
      const remaining = nodes.filter((n) => n.id !== selected.id);
      if (remaining.length > 0) setSelected(remaining[0]);
      else onClose();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-2xl mx-4" style={{ maxHeight: "85vh" }}>

        {/* ── LEFT: Lista de nodos ── */}
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all mb-1 ${
                    isSel
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

        {/* ── RIGHT: Edición ── */}
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

              {/* Ubicación */}
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

              {/* Versión FW */}
              <div className="flex flex-col gap-1.5">
                <label className="label-sm" htmlFor="cfg-fw">
                  Versión firmware
                  <span className="ml-1.5 text-[10px] font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  id="cfg-fw"
                  type="text"
                  value={form.version_fw}
                  onChange={set("version_fw")}
                  className="input-base font-mono"
                  placeholder="1.0.0"
                />
              </div>

              {/* Activo — toggle switch */}
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

              {/* Mensaje de feedback */}
              {msg && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border ${
                  msg.type === "ok"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    {msg.type === "ok"
                      ? <><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></>
                      : <><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="10" r="0.8" fill="currentColor"/></>
                    }
                  </svg>
                  {msg.text}
                </div>
              )}

              {/* Botón Guardar */}
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

              {/* ── Zona de peligro ── */}
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
  );
}
