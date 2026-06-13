import { useState, useEffect } from "react";
import { registrarMuestra } from "../api";
import Modal from "./common/Modal";
import InputField from "./common/InputField";
import Alert from "./common/Alert";
import SuccessState from "./common/SuccessState";

export default function MuestraModal({ node, onClose, onSuccess }) {
  const [valores, setValores] = useState({
    ph: "",
    temperatura: "",
    conductividad: "",
    turbidez: "",
    tds: "",
  });
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (node?.valores) {
      setValores({
        ph: node.valores.ph ?? "",
        temperatura: node.valores.temperatura ?? "",
        conductividad: node.valores.conductividad ?? "",
        turbidez: node.valores.turbidez ?? "",
        tds: node.valores.tds ?? "",
      });
    }
  }, [node]);

  const handleChange = (param) => (e) => {
    const val = e.target.value;
    setValores((prev) => ({ ...prev, [param]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!node) return;

    // Convert values to float numbers, filtering out empty ones
    const parsedValores = {};
    let hasValue = false;
    for (const [k, v] of Object.entries(valores)) {
      if (v !== "" && v !== null && v !== undefined) {
        parsedValores[k] = parseFloat(v);
        hasValue = true;
      }
    }

    if (!hasValue) {
      setError("Debes ingresar al menos un parámetro válido.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await registrarMuestra({
        nodo_id: node.id,
        valores: parsedValores,
        nota: nota.trim()
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Error al registrar la muestra oficial.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Registrar Muestra Oficial"
      subtitle={`${node?.ubicacion || node?.node_id} • ${node?.mac}`}
    >
      {success ? (
        <SuccessState
          title="¡Muestra Registrada!"
          description="La muestra oficial ha sido guardada exitosamente en el servidor del ICUAP."
          onConfirm={onSuccess}
        />
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Confirma los parámetros tomados de la muestra física. Se han pre-llenado con los valores telemétricos actuales del nodo.
          </p>

          {/* Inputs de Parámetros */}
          <div className="grid grid-cols-2 gap-4">
            {/* pH */}
            <InputField
              id="muestra-ph"
              label={
                <div className="flex justify-between w-full">
                  <span>pH</span>
                  <span className="text-[9px] font-normal text-slate-400 font-mono">unidad</span>
                </div>
              }
              type="number"
              step="any"
              value={valores.ph}
              onChange={handleChange("ph")}
              placeholder="6.5 - 8.5"
            />

            {/* Temperatura */}
            <InputField
              id="muestra-temperatura"
              label={
                <div className="flex justify-between w-full">
                  <span>Temperatura</span>
                  <span className="text-[9px] font-normal text-slate-400 font-mono">°C</span>
                </div>
              }
              type="number"
              step="any"
              value={valores.temperatura}
              onChange={handleChange("temperatura")}
              placeholder="0 - 40"
            />

            {/* Turbidez */}
            <InputField
              id="muestra-turbidez"
              label={
                <div className="flex justify-between w-full">
                  <span>Turbidez</span>
                  <span className="text-[9px] font-normal text-slate-400 font-mono">NTU</span>
                </div>
              }
              type="number"
              step="any"
              value={valores.turbidez}
              onChange={handleChange("turbidez")}
              placeholder="0 - 5"
            />

            {/* Conductividad */}
            <InputField
              id="muestra-conductividad"
              label={
                <div className="flex justify-between w-full">
                  <span>Conductividad</span>
                  <span className="text-[9px] font-normal text-slate-400 font-mono">µS/cm</span>
                </div>
              }
              type="number"
              step="any"
              value={valores.conductividad}
              onChange={handleChange("conductividad")}
              placeholder="0 - 1500"
            />

            {/* TDS */}
            <div className="col-span-2">
              <InputField
                id="muestra-tds"
                label={
                  <div className="flex justify-between w-full">
                    <span>TDS (Sólidos Disueltos Totales)</span>
                    <span className="text-[9px] font-normal text-slate-400 font-mono">mg/L</span>
                  </div>
                }
                type="number"
                step="any"
                value={valores.tds}
                onChange={handleChange("tds")}
                placeholder="0 - 1000"
              />
            </div>
          </div>

          {/* Notas / Comentario */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm text-xs font-semibold text-slate-700" htmlFor="muestra-nota">
              Observaciones / Nota de campo
            </label>
            <textarea
              id="muestra-nota"
              rows="3"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="input-base py-2 px-3 text-xs leading-relaxed custom-scrollbar resize-none"
              placeholder="Ej. Muestra analizada en laboratorio de química. Calibración manual de sensores verificada..."
            />
          </div>

          {error && <Alert message={error} type="error" />}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-ghost flex-1 justify-center py-2 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 justify-center py-2 text-xs"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                "Guardar Muestra"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
