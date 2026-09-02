import { useState } from "react";
import CardCorners from "./CardCorners";

// La contraseña en texto plano solo llega en esta pantalla puntual (al crear el nodo
// o al regenerar credenciales) — no se persiste en la BD, así que no hay forma de
// recuperarla después. Por eso el cierre es explícito y no hay X ni cierre por backdrop.
export default function MqttCredentialsModal({ username, password, message, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro, etc.) —
      // el usuario aún puede seleccionar el texto manualmente desde el input.
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="relative bg-white border border-slate-300 w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        <CardCorners color="border-kanan-400" />

        <div className="px-6 py-4 border-b border-slate-300">
          <h2 className="text-sm font-bold text-kanan-900">Credenciales MQTT del nodo</h2>
          <p className="text-xs text-slate-400 mt-0.5">Usa estos datos para configurar el dispositivo físico.</p>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Usuario */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="mqtt-username">Usuario</label>
            <input
              id="mqtt-username"
              type="text"
              readOnly
              value={username}
              onFocus={(e) => e.target.select()}
              className="input-base font-mono text-xs bg-slate-50"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="label-sm" htmlFor="mqtt-password">Contraseña</label>
            <div className="flex items-center gap-2">
              <input
                id="mqtt-password"
                type="text"
                readOnly
                value={password}
                onFocus={(e) => e.target.select()}
                className="input-base font-mono text-xs bg-slate-50 flex-1"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border transition-colors whitespace-nowrap ${
                  copied
                    ? "bg-status-ok/10 border-status-ok/40 text-status-ok"
                    : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Copiado
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <rect x="4.5" y="4.5" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M2.5 9.5v-7a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Aviso persistente (no un toast) */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-status-warn/10 border border-status-warn/40 text-status-warn text-xs leading-relaxed">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
              <path d="M12 8v4M12 16h.01M10.29 3.86l-8.18 14.18A2 2 0 004 21h16a2 2 0 001.89-2.96L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium">
              {message || "Guarda esta contraseña ahora — no volverá a mostrarse."}
              {" "}Si la pierdes, la única opción es regenerarla, lo que invalidará esta y requerirá reflashear el dispositivo.
            </span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="btn-primary w-full justify-center">
            Ya la guardé, cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
