import { useState } from "react";

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm1 5a1 1 0 00-1 1v2a1 1 0 001 1h12a1 1 0 001-1v-2a1 1 0 00-1-1H4z" clipRule="evenodd" />
      </svg>
    ),
    title: "Telemetría en tiempo real",
    desc: "pH, turbidez, conductividad, temperatura y TDS con actualización continua.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
      </svg>
    ),
    title: "Cumplimiento NOM-127",
    desc: "Validación automática de parámetros contra la norma oficial mexicana.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
    title: "Red de nodos IoT",
    desc: "Monitoreo distribuido 24/7 en los depósitos de Ciudad Universitaria.",
  },
];

export default function Login({ onLogin, onGoRegister }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/v1/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: usuario.trim(), password }),
        }
      );

      let data;
      try { data = await res.json(); }
      catch { throw new Error("Respuesta inválida del servidor."); }

      if (!res.ok) {
        throw new Error(data.mensaje || "Credenciales incorrectas.");
      }

      onLogin(data.token, data.usuario);

    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = usuario.trim() && password.trim() && !loading;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-buap-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/[0.03]" />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2C11 10 5 13 5 21a11 11 0 0022 0c0-8-6-11-11-19z" fill="rgba(255,255,255,0.9)" />
              <circle cx="16" cy="21" r="4" fill="rgba(255,255,255,0.2)" />
              <circle cx="16" cy="21" r="2" fill="rgba(255,255,255,0.6)" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Kanan</h1>
            <p className="text-sm text-white/55 mt-1 leading-relaxed">
              Sistema de monitoreo de calidad del agua
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-buap-300 flex-shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/85">{f.title}</p>
                <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-xs text-white/30 leading-relaxed">
            Benemérita Universidad Autónoma de Puebla<br />
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
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
            <div className="mb-7">
              <h2 className="text-xl font-bold text-buap-900 tracking-tight">Iniciar sesión</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Ingresa tus credenciales para acceder al sistema de monitoreo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Email */}
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

              {/* Contraseña */}
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

              {/* Error */}
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

              {/* Submit */}
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

          <p className="text-center text-sm text-slate-500 mt-5">
            ¿No tienes cuenta?{" "}
            <button onClick={onGoRegister} className="text-buap-700 font-semibold hover:underline">
              Regístrate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
