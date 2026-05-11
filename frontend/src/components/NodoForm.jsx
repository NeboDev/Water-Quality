import { useState } from "react";
import { registrarNodo } from "../api";

// ── Validaciones simples en cliente ──────────────────
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export default function NodoForm({ token, onSuccess, onClose }) {
  const [form, setForm] = useState({ mac: "", ubicacion: "", version_fw: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((ev) => ({ ...ev, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!MAC_REGEX.test(form.mac.trim()))
      e.mac = "Formato inválido. Ejemplo: A4:CF:12:45:6B:2F";
    if (form.ubicacion.trim().length < 3)
      e.ubicacion = "Mínimo 3 caracteres";
    if (form.ubicacion.trim().length > 200)
      e.ubicacion = "Máximo 200 caracteres";
    if (form.version_fw && form.version_fw.length > 20)
      e.version_fw = "Máximo 20 caracteres";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }

    setLoading(true);
    setServerError("");
    try {
      const payload = {
        mac: form.mac.trim().toUpperCase(),
        ubicacion: form.ubicacion.trim(),
        ...(form.version_fw.trim() && { version_fw: form.version_fw.trim() }),
      };
      const data = await registrarNodo(token, payload);
      setSuccessData(data.nodo);
    } catch (err) {
      setServerError(err.message || "Error al registrar el nodo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-buap-900">Registrar nuevo nodo</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Los umbrales NOM-127 se asignan automáticamente.
            </p>
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

        {successData ? (
          <div className="px-6 py-8 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">¡Nodo registrado!</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              El nodo <span className="font-mono text-slate-700">{successData.mac}</span> ha sido registrado en <span className="font-semibold text-slate-700">{successData.ubicacion}</span> y sus umbrales NOM-127 fueron configurados correctamente.
            </p>
            <button onClick={() => onSuccess(successData)} className="btn-primary w-full justify-center">
              Aceptar y cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* MAC */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="nodo-mac">Dirección MAC <span className="text-red-400">*</span></label>
            <input
              id="nodo-mac"
              type="text"
              value={form.mac}
              onChange={set("mac")}
              placeholder="A4:CF:12:45:6B:2F"
              className={`input-base font-mono ${errors.mac ? "border-red-300 bg-red-50" : ""}`}
              autoComplete="off"
              spellCheck={false}
            />
            {errors.mac && <p className="text-xs text-red-500">{errors.mac}</p>}
          </div>

          {/* Ubicación */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="nodo-ubicacion">Ubicación <span className="text-red-400">*</span></label>
            <input
              id="nodo-ubicacion"
              type="text"
              value={form.ubicacion}
              onChange={set("ubicacion")}
              placeholder="Ej. Bebedero norte — Rectoría"
              className={`input-base ${errors.ubicacion ? "border-red-300 bg-red-50" : ""}`}
            />
            {errors.ubicacion && <p className="text-xs text-red-500">{errors.ubicacion}</p>}
          </div>

          {/* Versión FW (opcional) */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="nodo-fw">
              Versión firmware
              <span className="ml-1.5 text-[10px] font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="nodo-fw"
              type="text"
              value={form.version_fw}
              onChange={set("version_fw")}
              placeholder="1.0.0"
              className={`input-base font-mono ${errors.version_fw ? "border-red-300 bg-red-50" : ""}`}
            />
            {errors.version_fw && <p className="text-xs text-red-500">{errors.version_fw}</p>}
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.8" fill="currentColor" />
              </svg>
              {serverError}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                <>
                  Registrar nodo
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
