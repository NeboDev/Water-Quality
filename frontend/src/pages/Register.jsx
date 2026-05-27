import { useState } from "react";
import { validateField } from "../utils/validations";
import api from "../api";

export default function Register({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({ nombreUsuario: "", email: "", password: "", confirmPassword: "", rol: "visualizador" });
  const [fieldErrors, setFieldErrors] = useState({ nombreUsuario: "", email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);


  const handleChange = (field) => (e) => {
    const value = e.target.value;
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    setError("");

    const fieldErr = validateField(field, value);
    let confirmErr = "";
    if (field === "confirmPassword") {
      confirmErr = value !== form.password ? "Las contraseñas no coinciden." : "";
    } else if (field === "password" && form.confirmPassword) {
      confirmErr = form.confirmPassword !== value ? "Las contraseñas no coinciden." : "";
    }

    setFieldErrors((prev) => ({
      ...prev,
      [field]: fieldErr,
      confirmPassword: field === "password" && form.confirmPassword ? confirmErr : (field === "confirmPassword" ? confirmErr : prev.confirmPassword),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // force validation
    const nErr = validateField("nombreUsuario", form.nombreUsuario);
    const eErr = validateField("email", form.email);
    const pErr = validateField("password", form.password);
    const cpErr = form.password !== form.confirmPassword ? "Las contraseñas no coinciden." : "";

    if (nErr || eErr || pErr || cpErr || !form.nombreUsuario.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setFieldErrors({
        nombreUsuario: nErr || (!form.nombreUsuario.trim() ? "Requerido" : ""),
        email: eErr || (!form.email.trim() ? "Requerido" : ""),
        password: pErr || (!form.password.trim() ? "Requerido" : ""),
        confirmPassword: cpErr || (!form.confirmPassword.trim() ? "Requerido" : ""),
      });
      setError("Por favor, corrige los errores antes de continuar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/register", {
        nombre: form.nombreUsuario.trim(),
        email: form.email.trim(),
        password: form.password,
        rol: form.rol,
      });

      setUserData(res.data.usuario);
      setSuccess(true);

    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = fieldErrors.nombreUsuario || fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword;
  const canSubmit = form.nombreUsuario.trim() && form.email.trim() && form.password.trim() && form.confirmPassword.trim() && !hasErrors && !loading;

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-10">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-buap-900 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M16 2C11 10 5 13 5 21a11 11 0 0022 0c0-8-6-11-11-19z" fill="white" />
              </svg>
            </div>
            <span className="text-lg font-bold text-buap-900">Kanan</span>
          </div>

          <div className="card p-8 shadow-card-lg">

            {/* success view*/}
            {success ? (
              <div className="flex flex-col items-center text-center py-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-sm">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-buap-900 tracking-tight">¡Registro exitoso!</h2>
                <p className="text-sm text-slate-500 mt-2 mb-8 leading-relaxed">
                  Tu cuenta como <span className="font-semibold text-slate-700">Visualizador</span> ha sido creada. Ahora puedes acceder al sistema Kanan.
                </p>
                <button
                  onClick={() => onRegister(null, userData)}
                  className="btn-primary w-full justify-center h-11"
                >
                  Entrar al sistema
                </button>
              </div>
            ) : (
              /* form view */
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-buap-900 tracking-tight">Crear cuenta</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Completa el formulario para registrarte en el sistema.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {/* useer name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="label-sm" htmlFor="nombre-input">Nombre de usuario</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 13.5c0-2.5 2.69-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </span>
                      <input
                        id="nombre-input"
                        type="text"
                        value={form.nombreUsuario}
                        onChange={handleChange("nombreUsuario")}
                        placeholder="Juan Quintero"
                        className={`input-base pl-10 ${fieldErrors.nombreUsuario ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                    {fieldErrors.nombreUsuario && (
                      <p className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.nombreUsuario}</p>
                    )}
                  </div>

                  {/* emaiil */}
                  <div className="flex flex-col gap-1.5">
                    <label className="label-sm" htmlFor="email-input">Correo electrónico</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </span>
                      <input
                        id="email-input"
                        type="email"
                        value={form.email}
                        onChange={handleChange("email")}
                        placeholder="ejemplo@alumno.buap.mx"
                        className={`input-base pl-10 ${fieldErrors.email ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                        autoComplete="email"
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* passweord */}
                  <div className="flex flex-col gap-1.5">
                    <label className="label-sm" htmlFor="reg-password-input">Contraseña</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <circle cx="8" cy="11" r="1.2" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        id="reg-password-input"
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange("password")}
                        placeholder="Mín. 8 caracteres"
                        className={`input-base pl-10 pr-11 ${fieldErrors.password ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                        tabIndex={-1}
                      >
                        {showPass ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* confirm password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="label-sm" htmlFor="reg-confirm-password-input">Confirmar contraseña</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <circle cx="8" cy="11" r="1.2" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        id="reg-confirm-password-input"
                        type={showPass ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={handleChange("confirmPassword")}
                        placeholder="Repite la contraseña"
                        className={`input-base pl-10 pr-11 ${fieldErrors.confirmPassword ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                        tabIndex={-1}
                      >
                        {showPass ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* server glbal erro */}
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium animate-shake">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="7" cy="10" r="0.8" fill="currentColor" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="btn-primary h-11 justify-center mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    ) : (
                      <>
                        Crear cuenta
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Back to login - Solo visible si no estamos en la pantalla de éxito */}
          {!success && (
            <p className="text-center text-sm text-slate-500 mt-5">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={onGoLogin}
                className="text-buap-700 font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}