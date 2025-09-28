// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#04060f",
        surface: "#0a1030",
        card: "rgba(13,22,52,0.85)",
        primary: "#7f5af0",
        secondary: "#2cb67d",
        accent: "#f1a208",
        electric: "#40c4ff",
        danger: "#ff3366",
        genz: {
          lilac: "#c084fc",
          blush: "#ff8ba7",
          mint: "#5ef38c",
          sky: "#67e8f9",
          midnight: "#0f172a",
        },
        rb: {
          navy: "#001845",
          blue: "#003087",
          red: "#d50032",
          yellow: "#f5c300",
          asphalt: "#151b2f",
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        display: ["Montserrat", "Space Grotesk", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        neon: "0 0 35px rgba(127,90,240,0.45)",
        pit: "0 25px 60px rgba(0,24,69,0.55)",
      },
      backgroundImage: {
        "rb-pulse": "linear-gradient(120deg, rgba(0,24,69,0.95) 0%, rgba(213,0,50,0.8) 55%, rgba(245,195,0,0.65) 100%)",
        "genz-grid": "linear-gradient(135deg, rgba(127,90,240,0.2) 0%, rgba(103,232,249,0.15) 40%, rgba(94,243,140,0.1) 100%)",
        "asphalt-texture": "radial-gradient(circle at 10% 20%, rgba(64,196,255,0.15) 0, transparent 40%), radial-gradient(circle at 90% 30%, rgba(213,0,50,0.12) 0, transparent 45%), linear-gradient(160deg, rgba(21,27,47,0.95), rgba(4,6,15,0.95))",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 rgba(127,90,240,0.0)" },
          "50%": { boxShadow: "0 0 30px rgba(127,90,240,0.45)" },
        },
        "speed-line": {
          "0%": { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(40%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "speed-line": "speed-line 6s linear infinite",
      },
      backdropBlur: {
        track: "18px",
      },
    },
  },
  plugins: [],
}
