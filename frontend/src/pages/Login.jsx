import { useState, useRef, useEffect } from "react";
import { login } from "../api";
import WaterRippleGL from "../components/WaterRippleGL";

export default function Login({ onLogin, onGoRegister }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const rippleRef = useRef(null); // ref al effect de ripple 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await login(usuario.trim(), password);
      onLogin(data.usuario);

    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = usuario.trim() && password.trim() && !loading;

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
          <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl md:rounded-[2rem] bg-buap-900 flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md">
            <svg viewBox="0 0 32 32" fill="none" className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16">
              <path d="M16 2C11 10 5 13 5 21a11 11 0 0022 0c0-8-6-11-11-19z" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-buap-900 tracking-tighter leading-none mb-1 md:mb-2 drop-shadow-sm">
              Kanan
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-slate-700/90 font-medium tracking-wide drop-shadow-sm leading-tight md:leading-snug">
              Sistema de Monitoreo IoT de <br />la calidad del agua
            </p>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Login */}
      <div className="relative z-10 w-full md:w-1/2 flex flex-col items-center justify-center p-4 py-8 animate-fade-in">
        <div className="w-full max-w-sm">
          {/* Form Card - conserved exactly as is */}
          <div className="card p-8 shadow-card-lg backdrop-blur-sm bg-white/90">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-buap-900 tracking-tight">Iniciar sesión</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Ingresa tus credenciales para acceder al sistema de monitoreo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* email */}
              <div className="flex flex-col gap-1.5">
                <label className="label-sm" htmlFor="usuario-input">Correo electrónico</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="usuario-input"
                    type="email"
                    value={usuario}
                    onChange={(e) => { setUsuario(e.target.value); setError(""); }}
                    placeholder="correo@ejemplo.com"
                    className="input-base pl-10"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* password */}
              <div className="flex flex-col gap-1.5">
                <label className="label-sm" htmlFor="password-input">Contraseña</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="8" cy="11" r="1.2" fill="currentColor" />
                    </svg>
                  </span>
                  <input
                    id="password-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="input-base pl-10 pr-11"
                    autoComplete="current-password"
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
              </div>

              {/* errors */}
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

              {/* submit button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary h-11 justify-center mt-1"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                ) : (
                  <>
                    Iniciar sesión
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-700 mt-5 font-medium drop-shadow-sm">
            ¿No tienes cuenta?{" "}
            <button onClick={onGoRegister} className="text-buap-900 font-bold hover:underline">
              Regístrate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
