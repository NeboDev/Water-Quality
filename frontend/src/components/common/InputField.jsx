import { useState } from "react";

export default function InputField({ label, icon, error, type = "text", ...props }) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPass ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="label-sm" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`input-base ${icon ? "pl-10" : ""} ${
            error ? "border-status-alert bg-status-alert/5 focus:ring-status-alert/30 focus:border-status-alert" : ""
          } ${isPassword ? "pr-11" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            tabIndex={-1}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              {showPass && (
                <line x1="2" y1="2" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        )}
      </div>
      {error && <p className="text-xs text-status-alert">{error}</p>}
    </div>
  );
}
