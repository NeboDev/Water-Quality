export default function SuccessState({ title, description, onConfirm, confirmText = "Aceptar y cerrar" }) {
  return (
    <div className="px-6 py-8 flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="w-14 h-14 bg-status-ok/10 text-status-ok flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <div className="text-xs text-slate-500 mb-6 leading-relaxed">
        {description}
      </div>
      <button onClick={onConfirm} className="btn-primary w-full justify-center">
        {confirmText}
      </button>
    </div>
  );
}
