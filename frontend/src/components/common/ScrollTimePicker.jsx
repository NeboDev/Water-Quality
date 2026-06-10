import { useEffect, useState, useRef } from "react";

export default function ScrollTimePicker({ value, onChange, disabled }) {
  const getNowTime = () => {
    const now = new Date();
    return {
      hr: String(now.getHours()).padStart(2, "0"),
      mn: String(now.getMinutes()).padStart(2, "0"),
    };
  };

  const [hour, setHour] = useState(() => {
    if (value && value.includes(":")) {
      return value.split(":")[0];
    }
    return getNowTime().hr;
  });

  const [minute, setMinute] = useState(() => {
    if (value && value.includes(":")) {
      return value.split(":")[1];
    }
    return getNowTime().mn;
  });

  const hourInputRef = useRef(null);
  const minInputRef = useRef(null);
  const stateRef = useRef({ hour, minute });

  // Sync external changes (like resetting the form)
  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setHour(h);
      setMinute(m);
    } else {
      const now = getNowTime();
      setHour(now.hr);
      setMinute(now.mn);
    }
  }, [value]);

  // Keep ref updated synchronously for wheel handlers
  useEffect(() => {
    stateRef.current = { hour, minute };
  }, [hour, minute]);

  const triggerChange = (h, m) => {
    onChange?.(`${h}:${m}`);
  };

  // Bind mouse wheel listeners to prevent page/modal scroll on wheel
  useEffect(() => {
    const handleHourWheel = (e) => {
      if (disabled) return;
      e.preventDefault();
      const { hour: hr, minute: mn } = stateRef.current;
      const isUp = e.deltaY < 0;
      const val = parseInt(hr, 10) || 0;
      const next = isUp ? (val + 1) % 24 : (val - 1 + 24) % 24;
      const formattedHr = String(next).padStart(2, "0");
      setHour(formattedHr);
      triggerChange(formattedHr, mn);
    };

    const handleMinWheel = (e) => {
      if (disabled) return;
      e.preventDefault();
      const { hour: hr, minute: mn } = stateRef.current;
      const isUp = e.deltaY < 0;
      const val = parseInt(mn, 10) || 0;
      const next = isUp ? (val + 1) % 60 : (val - 1 + 60) % 60;
      const formattedMn = String(next).padStart(2, "0");
      setMinute(formattedMn);
      triggerChange(hr, formattedMn);
    };

    const hrEl = hourInputRef.current;
    const minEl = minInputRef.current;

    if (hrEl) hrEl.addEventListener("wheel", handleHourWheel, { passive: false });
    if (minEl) minEl.addEventListener("wheel", handleMinWheel, { passive: false });

    return () => {
      if (hrEl) hrEl.removeEventListener("wheel", handleHourWheel);
      if (minEl) minEl.removeEventListener("wheel", handleMinWheel);
    };
  }, [disabled]);

  const handleHourChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setHour(val);
    triggerChange(val, minute);
  };

  const handleHourBlur = () => {
    let valInt = parseInt(hour, 10);
    if (isNaN(valInt)) {
      valInt = new Date().getHours();
    }
    const clamped = Math.max(0, Math.min(23, valInt));
    const formatted = String(clamped).padStart(2, "0");
    setHour(formatted);
    triggerChange(formatted, minute);
  };

  const handleMinChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinute(val);
    triggerChange(hour, val);
  };

  const handleMinBlur = () => {
    let valInt = parseInt(minute, 10);
    if (isNaN(valInt)) {
      valInt = new Date().getMinutes();
    }
    const clamped = Math.max(0, Math.min(59, valInt));
    const formatted = String(clamped).padStart(2, "0");
    setMinute(formatted);
    triggerChange(hour, formatted);
  };

  return (
    <div
      className={`flex items-center gap-1 bg-slate-50/50 border border-slate-200 rounded-xl px-1.5 py-1 h-8.5 w-24 justify-center flex-shrink-0 transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-300"
      }`}
      title={disabled ? "" : "Desplaza (scroll) con el ratón o haz clic para editar la hora"}
    >
      <input
        ref={hourInputRef}
        type="text"
        value={hour}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        disabled={disabled}
        className="text-center font-mono text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:text-buap-600 focus:bg-slate-100/80 rounded-md transition-colors"
        style={{ width: "24px" }}
        placeholder="HH"
        inputMode="numeric"
      />
      <span className="text-slate-400 font-bold select-none text-[11px]">:</span>
      <input
        ref={minInputRef}
        type="text"
        value={minute}
        onChange={handleMinChange}
        onBlur={handleMinBlur}
        disabled={disabled}
        className="text-center font-mono text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:text-buap-600 focus:bg-slate-100/80 rounded-md transition-colors"
        style={{ width: "24px" }}
        placeholder="MM"
        inputMode="numeric"
      />
    </div>
  );
}
