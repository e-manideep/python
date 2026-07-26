/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#10192E",
          700: "#1B2740",
          500: "#3B4A66",
          300: "#7C8AA5",
        },
        paper: "#F8F7F3",
        line: "#E4E2DA",
        teal: {
          DEFAULT: "#0F6E63",
          light: "#13897B",
          pale: "#E4F2EF",
        },
        amber: {
          DEFAULT: "#9C6B12",
          pale: "#FBF1DD",
        },
        rose: {
          DEFAULT: "#A32B24",
          pale: "#F8E7E5",
        },
        moss: {
          DEFAULT: "#3C6B35",
          pale: "#E9F1E5",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,25,46,0.04), 0 1px 1px rgba(16,25,46,0.03)",
      },
    },
  },
  plugins: [],
};
