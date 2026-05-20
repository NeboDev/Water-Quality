import { useState } from "react";
import { registrarNodo } from "../api";
import Modal from "./common/Modal";
import InputField from "./common/InputField";
import Alert from "./common/Alert";
import SuccessState from "./common/SuccessState";

// ── Validaciones simples en cliente ──────────────────
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export default function NodoForm({ onSuccess, onClose }) {
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
      const data = await registrarNodo(payload);
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
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* MAC */}
          <InputField
            id="nodo-mac"
            label="Dirección MAC *"
            type="text"
            value={form.mac}
            onChange={set("mac")}
            placeholder="A4:CF:12:45:6B:2F"
            error={errors.mac}
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Ubicación */}
          <InputField
            id="nodo-ubicacion"
            label="Ubicación *"
            type="text"
            value={form.ubicacion}
            onChange={set("ubicacion")}
            placeholder="Ej. Bebedero norte — Rectoría"
            error={errors.ubicacion}
          />

          {/* Versión FW (opcional) */}
          <InputField
            id="nodo-fw"
            label={
              <>
                Versión firmware
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(opcional)</span>
              </>
            }
            type="text"
            value={form.version_fw}
            onChange={set("version_fw")}
            placeholder="1.0.0"
            error={errors.version_fw}
            className="font-mono"
          />

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
