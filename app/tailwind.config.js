/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void:    "#050508",
        abyss:   "#08080f",
        surface: "#0d0d1a",
        panel:   "#111122",
        border:  "#1e1e3a",
        muted:   "#2a2a4a",
        dim:     "#6b6b9e",
        ghost:   "#9494c4",
        text:    "#e8e8ff",
        arcium:  "#7c5cfc",
        "arcium-bright": "#a78bfa",
        "arcium-glow":   "#4c1d95",
        profit: "#00e5a0",
        loss:   "#ff4466",
        warn:   "#ffaa00",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "monospace"],
        mono:    ["'JetBrains Mono'", "monospace"],
        body:    ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        "arcium": "0 0 40px rgba(124, 92, 252, 0.15), 0 0 80px rgba(124, 92, 252, 0.05)",
        "arcium-intense": "0 0 60px rgba(124, 92, 252, 0.3)",
        "profit": "0 0 20px rgba(0, 229, 160, 0.2)",
        "loss":   "0 0 20px rgba(255, 68, 102, 0.2)",
        "panel":  "0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      animation: {
        "pulse-arcium": "pulseArcium 3s ease-in-out infinite",
        "scan": "scan 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glow-text": "glowText 2s ease-in-out infinite alternate",
      },
      keyframes: {
        pulseArcium: {
          "0%, 100%": { opacity: "0.4" },
          "50%":      { opacity: "1"   },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)"  },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)"   },
          "50%":      { transform: "translateY(-8px)"  },
        },
        glowText: {
          "0%":   { textShadow: "0 0 10px rgba(124,92,252,0.5)" },
          "100%": { textShadow: "0 0 30px rgba(124,92,252,1), 0 0 60px rgba(124,92,252,0.5)" },
        },
      },
      backgroundImage: {
        "grid-pattern": `
          linear-gradient(rgba(124, 92, 252, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124, 92, 252, 0.03) 1px, transparent 1px)
        `,
        "radial-arcium": "radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.15) 0%, transparent 70%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
    },
  },
  plugins: [],
};
