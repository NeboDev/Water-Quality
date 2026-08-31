import { useState } from "react";
import api from "../api";
import Modal from "./common/Modal";
import InputField from "./common/InputField";
import Alert from "./common/Alert";
import SuccessState from "./common/SuccessState";
import { validateField } from "../utils/validations";

const ROLES = [
  { value: "admin",       label: "Administrador",      desc: "Acceso total al sistema." },
  { value: "icuap",       label: "Investigador (ICUAP)", desc: "Registro de muestras oficiales." },
  { value: "operador",    label: "Operador Técnico",   desc: "Monitoreo y resolución de alertas." },
  { value: "visualizador", label: "Visualizador",      desc: "Solo lectura de telemetría y mapas." },
];

const ROLE_COLORS = {
  admin:        "bg-kanan-700 border-kanan-700 text-white",
  icuap:        "bg-violet-600 border-violet-600 text-white",
  operador:     "bg-amber-500 border-amber-500 text-white",
  visualizador: "bg-slate-500 border-slate-500 text-white",
};

export default function UsuarioForm({ onSuccess, onClose }) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmPassword: "", rol: "visualizador" });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: val };
      if (field === "confirmPassword" || field === "password") {
        if (next.confirmPassword && next.password !== next.confirmPassword) {
          setServerError("Las contraseñas no coinciden.");
        } else {
          setServerError("");
        }
      }
      return next;
    });
    if (field !== "confirmPassword" && field !== "password") {
      setServerError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setServerError("Por favor completa todos los campos.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setServerError("Las contraseñas no coinciden.");
      return;
    }

    const emailErr = validateField("email", form.email.trim());
    if (emailErr) {
      setServerError(emailErr);
      return;
    }

    const passwordErr = validateField("password", form.password);
    if (passwordErr) {
      setServerError(passwordErr);
      return;
    }

    setLoading(true);
    setServerError("");
    try {
      await api.post("/auth/register", {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        rol: form.rol,
      });
      setSuccessMsg(true);
    } catch (err) {
      setServerError(err.message || "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.nombre.trim() && form.email.trim() && form.password.trim() && form.confirmPassword.trim() && form.password === form.confirmPassword && !loading;

  return (
    <Modal
      onClose={onClose}
      title="Crear nuevo usuario"
      subtitle="Solo el administrador puede asignar roles."
    >
      {successMsg ? (
        <SuccessState
          title="¡Usuario creado!"
          description={
            <>
              El usuario <span className="font-semibold text-slate-700">{form.nombre}</span> ha sido registrado exitosamente con el rol de <span className="font-semibold text-slate-700">{ROLES.find(r => r.value === form.rol)?.label}</span>.
            </>
          }
          onConfirm={() => { onSuccess?.(); onClose(); }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Nombre */}
          <InputField
            id="usr-nombre"
            label="Nombre completo *"
            type="text"
            value={form.nombre}
            onChange={set("nombre")}
            placeholder="Ej. Ana Martínez"
            autoFocus
            icon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 13c0-2.5 2.46-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
          />

          {/* Email */}
          <InputField
            id="usr-email"
            label="Correo electrónico *"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="ejemplo@alumno.buap.mx"
            autoComplete="off"
            icon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
          />

          {/* Contraseña */}
          <InputField
            id="usr-password"
            label="Contraseña *"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            icon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="3" y="6.5" width="9" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 6.5V5a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="7.5" cy="10" r="1" fill="currentColor" />
              </svg>
            }
          />

          {/* Confirmar contraseña */}
          <InputField
            id="usr-confirm-password"
            label="Confirmar contraseña *"
            type="password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            icon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="3" y="6.5" width="9" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 6.5V5a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="7.5" cy="10" r="1" fill="currentColor" />
              </svg>
            }
          />

          {/* Rol */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm">Rol del usuario</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rol: r.value }))}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 border text-left transition-colors duration-150 ${
                    form.rol === r.value
                      ? ROLE_COLORS[r.value]
                      : "bg-white border-slate-300 text-slate-600 hover:border-kanan-400 hover:text-kanan-800"
                  }`}
                >
                  <span className="text-xs font-bold leading-none">{r.label}</span>
                  <span className={`text-[10px] leading-snug mt-0.5 ${form.rol === r.value ? "opacity-80" : "text-slate-400"}`}>
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          <Alert message={serverError} type="error" />

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit} className="btn-primary flex-1 justify-center">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                <>
                  Crear usuario
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
