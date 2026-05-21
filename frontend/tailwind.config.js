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
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,32,96,0.07), 0 1px 2px rgba(0,32,96,0.05)",
        "card-md": "0 4px 12px rgba(0,32,96,0.09), 0 1px 4px rgba(0,32,96,0.06)",
        "card-lg": "0 8px 24px rgba(0,32,96,0.12), 0 2px 8px rgba(0,32,96,0.07)",
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
      },
    },
  },
  plugins: [],
};
