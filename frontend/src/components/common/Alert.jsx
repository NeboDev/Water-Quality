export default function Alert({ message, type = "error" }) {
  if (!message) return null;

  const styles = {
    error: "bg-status-alert/10 border border-status-alert/40 text-status-alert",
    success: "bg-status-ok/10 border border-status-ok/40 text-status-ok",
    info: "bg-kanan-100 border border-kanan-200 text-kanan-700",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium animate-fade-in ${
        styles[type] || styles.error
      }`}
    >
      {type === "error" && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="10" r="0.8" fill="currentColor" />
        </svg>
      )}
      {type === "success" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {type === "info" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )}
      <span className="leading-snug">{message}</span>
    </div>
  );
}
