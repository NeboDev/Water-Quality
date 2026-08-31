import CardCorners from "./CardCorners";

export default function Modal({ isOpen = true, onClose, title, subtitle, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white border border-slate-300 w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        <CardCorners />
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300">
          <div>
            <h2 className="text-sm font-bold text-kanan-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
