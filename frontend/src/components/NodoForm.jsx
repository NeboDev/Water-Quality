import { useState } from "react";
import { registrarNodo, editarUmbralesDeNodo } from "../api";
import Modal from "./common/Modal";
import InputField from "./common/InputField";
import Alert from "./common/Alert";
import SuccessState from "./common/SuccessState";

// validaciones del lado del cliente
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

const DEFAULTS = {
  ph: { valor_min: 6.5, valor_max: 8.5 },
  turbidez: { valor_min: 0, valor_max: 5 },
  conductividad: { valor_min: 0, valor_max: 1500 },
  temperatura: { valor_min: 0, valor_max: 40 },
  tds: { valor_min: 0, valor_max: 1000 }
};

export default function NodoForm({ onSuccess, onClose }) {
  const [form, setForm] = useState({ mac: "", ubicacion: "", version_fw: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [umbralesForm, setUmbralesForm] = useState(DEFAULTS);

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
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      if (validation.version_fw) {
        setShowAdvanced(true);
      }
      return;
    }

    setLoading(true);
    setServerError("");
    try {
      const payload = {
        mac: form.mac.trim().toUpperCase(),
        ubicacion: form.ubicacion.trim(),
        ...(form.version_fw.trim() && { version_fw: form.version_fw.trim() }),
      };
      const data = await registrarNodo(payload);
      
      // Guardar umbrales individuales en el nuevo nodo
      await editarUmbralesDeNodo(data.nodo.id, umbralesForm);

      setSuccessData(data.nodo);
    } catch (err) {
      setServerError(err.message || "Error al registrar el nodo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Registrar nuevo nodo"
      subtitle="Los umbrales NOM-127 se asignan automáticamente."
    >
      {successData ? (
        <SuccessState
          title="¡Nodo registrado!"
          description={
            <>
              El nodo <span className="font-mono text-slate-700">{successData.mac}</span> ha sido registrado en <span className="font-semibold text-slate-700">{successData.ubicacion}</span> y sus umbrales NOM-127 fueron configurados correctamente.
            </>
          }
          onConfirm={() => onSuccess(successData)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* MAC */}
          <InputField
            id="nodo-mac"
            label="Dirección MAC *"
            type="text"
            value={form.mac}
            onChange={set("mac")}
            placeholder="A4:CF:12:45:6B:2F"
            error={errors.mac}
          />

          {/* Ubicación */}
          <InputField
            id="nodo-ubicacion"
            label="Ubicación *"
            type="text"
            value={form.ubicacion}
            onChange={set("ubicacion")}
            placeholder="Ej. Tanque norte — Rectoría"
            error={errors.ubicacion}
          />

          {/* Opciones avanzadas (Versión de Firmware y Umbrales) */}
          {/* flex-shrink-0: sin esto, al ser overflow-hidden dentro de un flex-col con
              max-height, el navegador reduce este bloque por debajo de su contenido real
              (min-height automático de flex items pasa a 0 cuando overflow != visible),
              lo que rompe el scroll del formulario completo. */}
          <div className="border border-slate-300 overflow-hidden mt-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left focus:outline-none"
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
                className={`text-slate-400 transition-transform duration-200 ${showAdvanced ? "rotate-180 text-kanan-500" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="p-4 bg-white border-t border-slate-300 flex flex-col gap-4 animate-fade-in">
                {/* Versión FW (opcional) */}
                <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-200">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide" htmlFor="nodo-fw">
                    Versión firmware
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400 font-sans lowercase">(opcional)</span>
                  </label>
                  <input
                    id="nodo-fw"
                    type="text"
                    value={form.version_fw}
                    onChange={set("version_fw")}
                    className="input-base font-mono h-8.5 py-1.5 text-xs bg-slate-50/50"
                    placeholder="1.0.0"
                  />
                  {errors.version_fw && (
                    <p className="text-[10px] text-status-alert font-medium">{errors.version_fw}</p>
                  )}
                </div>

                {/* Configuración de Umbrales */}
                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Configurar Umbrales de Alerta
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Modifica los valores límites de alerta iniciales para este nodo. Si una lectura sale de este rango, se detonará una alerta inmediata.
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
                      <div key={param} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200 last:border-0">
                        <div className="min-w-[100px]">
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
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-16 input-base text-xs text-center py-1 px-1.5 h-8 font-mono bg-slate-50/50"
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
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-16 input-base text-xs text-center py-1 px-1.5 h-8 font-mono bg-slate-50/50"
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

          {/* Error del servidor */}
          <Alert message={serverError} type="error" />

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
    </Modal>
  );
}
