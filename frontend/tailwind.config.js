/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        buap: {
          50:  "#eff4ff",
          100: "#dce6fd",
          200: "#c0d0fc",
          300: "#96b1fa",
          400: "#6489f5",
          500: "#4063ef",
          600: "#2b44e3",
          700: "#2333ce",
          800: "#232aa6",
          900: "#002060",
          950: "#01134a",
        },
        // Paleta de rebrand Kanan (#38b6ff / #004aad / #16697a) — usada en la parte pública (Landing).
        kanan: {
          100: "#eaf6ff",
          200: "#cfeaff",
          300: "#9fd9ff",
          400: "#38b6ff",
          500: "#1a94e0",
          600: "#0f6fc4",
          700: "#004aad",
          800: "#003a87",
          900: "#002a62",
        },
        lagoon: {
          100: "#e7f3f5",
          200: "#c7e4e8",
          300: "#9ccfd7",
          400: "#5fb0bd",
          500: "#2f8b9b",
          600: "#1f7787",
          700: "#16697a",
          800: "#10505d",
          900: "#0a3941",
        },
        // Paleta mate de instrumento de laboratorio — dashboard interno.
        status: {
          ok:      "#4f7f5b",
          warn:    "#c8901f",
          orange:  "#d98634",
          alert:   "#b03a2b",
          neutral: "#9a9a9c",
        },
        heat: {
          0: "#e2e8f0",
          1: "#e8c86a",
          2: "#d98634",
          3: "#b03a2b",
        },
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,32,96,0.07), 0 1px 2px rgba(0,32,96,0.05)",
        "card-md": "0 4px 12px rgba(0,32,96,0.09), 0 1px 4px rgba(0,32,96,0.06)",
        "card-lg": "0 8px 24px rgba(0,32,96,0.12), 0 2px 8px rgba(0,32,96,0.07)",
        tooltip: "0 4px 16px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl:  "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "spin-slow": "spin 0.8s linear infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        shake: "shake 0.3s ease",
        sweep: "sweep 1.1s ease-out 1",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.5, transform: "scale(1.4)" },
        },
        fadeIn: {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        sweep: {
          from: { transform: "scaleX(0)", opacity: 1 },
          to: { transform: "scaleX(1)", opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
