import { useState } from "react";

const ROLES = [
  { value: "admin",       label: "Administrador",      desc: "Acceso total al sistema." },
  { value: "icuap",       label: "Investigador (ICUAP)", desc: "Registro de muestras oficiales." },
  { value: "operador",    label: "Operador Técnico",   desc: "Monitoreo y resolución de alertas." },
  { value: "visualizador", label: "Visualizador",      desc: "Solo lectura de telemetría y mapas." },
];

const ROLE_COLORS = {
  admin:        "bg-buap-700 border-buap-700 text-white",
  icuap:        "bg-violet-600 border-violet-600 text-white",
  operador:     "bg-amber-500 border-amber-500 text-white",
  visualizador: "bg-slate-500 border-slate-500 text-white",
};

export default function UsuarioForm({ token, onSuccess, onClose }) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "visualizador" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      setServerError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: form.rol,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || "Error al crear el usuario.");
      setSuccessMsg(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.nombre.trim() && form.email.trim() && form.password.trim() && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-buap-900">Crear nuevo usuario</h2>
            <p className="text-xs text-slate-400 mt-0.5">Solo el administrador puede asignar roles.</p>
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

        {successMsg ? (
          <div className="px-6 py-8 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">¡Usuario creado!</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              El usuario <span className="font-semibold text-slate-700">{form.nombre}</span> ha sido registrado exitosamente con el rol de <span className="font-semibold text-slate-700">{ROLES.find(r => r.value === form.rol)?.label}</span>.
            </p>
            <button onClick={() => { onSuccess?.(); onClose(); }} className="btn-primary w-full justify-center">
              Aceptar y cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="usr-nombre">Nombre completo <span className="text-red-400">*</span></label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1.5 13c0-2.5 2.46-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="usr-nombre"
                type="text"
                value={form.nombre}
                onChange={set("nombre")}
                placeholder="Ej. Ana Martínez"
                className="input-base pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="usr-email">Correo electrónico <span className="text-red-400">*</span></label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1.5 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="usr-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="correo@buap.mx"
                className="input-base pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="usr-password">Contraseña <span className="text-red-400">*</span></label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="3" y="6.5" width="9" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 6.5V5a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="7.5" cy="10" r="1" fill="currentColor" />
                </svg>
              </span>
              <input
                id="usr-password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Mínimo 8 caracteres"
                className="input-base pl-10 pr-11"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                tabIndex={-1}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                  {showPass && <line x1="2" y1="2" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Rol */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm">Rol del usuario</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rol: r.value }))}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                    form.rol === r.value
                      ? ROLE_COLORS[r.value]
                      : "bg-white border-slate-200 text-slate-600 hover:border-buap-300 hover:text-buap-800"
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
      </div>
    </div>
  );
}
