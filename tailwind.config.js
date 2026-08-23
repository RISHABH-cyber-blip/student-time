/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14171F",
        surface: "#1E2230",
        surface2: "#181B26",
        border: "#2A2F42",
        amber: "#F2A65A",
        mint: "#6FCF97",
        coral: "#E8735A",
        muted: "#8B8FA3",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
