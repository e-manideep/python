/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        sans: ["'Manrope'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: { DEFAULT: "#0F1113", soft: "#4A5058", faint: "#868D96" },
        paper: "#F5F6F5",
        surface: "#FFFFFF",
        line: "#E1E3E1",
        pulse: { DEFAULT: "#12B76A", pale: "#E3F8EE" },
        good: { DEFAULT: "#3F7D4C", pale: "#E7F1E9" },
        warn: { DEFAULT: "#B7791F", pale: "#FBF1DE" },
        critical: { DEFAULT: "#D0453A", pale: "#FBEAE8" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,17,19,0.04), 0 1px 1px rgba(15,17,19,0.03)",
      },
    },
  },
  plugins: [],
};
