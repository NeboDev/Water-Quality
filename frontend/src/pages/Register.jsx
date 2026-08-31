import { useState, useRef, useEffect } from "react";
import { validateField } from "../utils/validations";
import api from "../api";
import WaterRippleGL from "../components/WaterRippleGL";
import BlueprintCard from "../components/landing/BlueprintCard";
import kananLogo from "../assets/images/kanan_logo.png";

export default function Register({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({ nombreUsuario: "", email: "", password: "", confirmPassword: "", rol: "visualizador" });
  const [fieldErrors, setFieldErrors] = useState({ nombreUsuario: "", email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);

  const rippleRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col md:flex-row bg-slate-50 select-none"
      onMouseMove={(e) => rippleRef.current?.addRipple(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        rippleRef.current?.addRipple(t.clientX, t.clientY);
      }}
      style={{ touchAction: "none" }}
    >
      {/* WebGL water background */}
      {!isMobile && (
        <div className="absolute inset-0 pointer-events-none">
          <WaterRippleGL ref={rippleRef} className="w-full h-full" />
        </div>
      )}

      {/* Panel Izquierdo: Branding */}
      <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center md:justify-end p-8 md:pr-12 lg:pr-24 animate-fade-in">
        <div className="flex flex-row items-center justify-center md:justify-start gap-4 md:gap-6 lg:gap-8 w-full max-w-md lg:max-w-lg">
          <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center">
            <img
              src={kananLogo}
              alt="Kanan"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="uppercase font-semibold leading-[1.04] tracking-wide text-[40px] md:text-[56px] lg:text-[64px] text-black mb-1 md:mb-2">
              Kanan
            </h1>
            <p className="text-base md:text-lg text-black/80 leading-relaxed">
              Sistema de Monitoreo IoT de <br />la calidad del agua
            </p>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Registro */}
      <div className="relative z-10 w-full md:w-1/2 flex flex-col items-center justify-center p-4 py-8 animate-fade-in">
        <div className="w-full max-w-sm">
          <BlueprintCard className="bg-white/90 backdrop-blur-sm p-8">

            {/* success view*/}
            {success ? (
              <div className="flex flex-col items-center text-center py-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold uppercase tracking-wide text-black">¡Registro exitoso!</h2>
                <p className="text-sm text-black/70 mt-2 mb-8 leading-relaxed">
                  Tu cuenta como <span className="font-semibold text-black">Visualizador</span> ha sido creada. Ahora puedes acceder al sistema Kanan.
                </p>
                <button
                  onClick={() => onRegister(null, userData)}
                  className="h-11 w-full flex items-center justify-center gap-2 bg-kanan-700 hover:bg-kanan-800 text-white font-medium text-[15px] transition-colors"
                >
                  Entrar al sistema
                </button>
              </div>
            ) : (
              /* form view */
              <>
                <div className="mb-6 pb-5 border-b border-black/15">
                  <h2 className="text-xl font-semibold uppercase tracking-wide text-black">Crear cuenta</h2>
                  <p className="text-sm text-black/70 mt-1.5 leading-relaxed">
                    Completa el formulario para registrarte en el sistema.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {/* useer name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-black/60" htmlFor="nombre-input">Nombre de usuario</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-black/40 pointer-events-none">
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
                        className={`w-full h-11 pl-10 pr-4 bg-white border text-sm text-black placeholder:text-black/35 outline-none transition-colors duration-150 ${fieldErrors.nombreUsuario ? "border-red-400 focus:border-red-500" : "border-black/20 focus:border-kanan-700"}`}
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
                    <label className="text-xs font-semibold uppercase tracking-wide text-black/60" htmlFor="email-input">Correo electrónico</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-black/40 pointer-events-none">
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
                        className={`w-full h-11 pl-10 pr-4 bg-white border text-sm text-black placeholder:text-black/35 outline-none transition-colors duration-150 ${fieldErrors.email ? "border-red-400 focus:border-red-500" : "border-black/20 focus:border-kanan-700"}`}
                        autoComplete="email"
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* passweord */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-black/60" htmlFor="reg-password-input">Contraseña</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-black/40 pointer-events-none">
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
                        className={`w-full h-11 pl-10 pr-11 bg-white border text-sm text-black placeholder:text-black/35 outline-none transition-colors duration-150 ${fieldErrors.password ? "border-red-400 focus:border-red-500" : "border-black/20 focus:border-kanan-700"}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 text-black/40 hover:text-black/70 transition-colors p-0.5"
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
                    <label className="text-xs font-semibold uppercase tracking-wide text-black/60" htmlFor="reg-confirm-password-input">Confirmar contraseña</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-black/40 pointer-events-none">
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
                        className={`w-full h-11 pl-10 pr-11 bg-white border text-sm text-black placeholder:text-black/35 outline-none transition-colors duration-150 ${fieldErrors.confirmPassword ? "border-red-400 focus:border-red-500" : "border-black/20 focus:border-kanan-700"}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 text-black/40 hover:text-black/70 transition-colors p-0.5"
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
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-shake">
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
                    className="h-11 w-full flex items-center justify-center gap-2 mt-1 bg-kanan-700 hover:bg-kanan-800 text-white font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </BlueprintCard>

          {/* Back to login - Solo visible si no estamos en la pantalla de éxito */}
          {!success && (
            <p className="text-center text-sm text-black/80 mt-5">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={onGoLogin}
                className="text-kanan-700 font-semibold hover:text-kanan-800 hover:underline"
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
