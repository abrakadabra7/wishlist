import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fdf8f6",
          100: "#f9ede8",
          200: "#f2d9ce",
          300: "#e8bfad",
          400: "#da9a7e",
          500: "#cc7a5c",
          600: "#b86244",
          700: "#994f39",
          800: "#7d4334",
          900: "#67392e",
          950: "#381b16",
        },
        surface: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 12px 28px -8px rgba(184,98,68,0.12), 0 4px 12px -2px rgba(0,0,0,0.06)",
        glow: "0 0 40px -8px rgba(184,98,68,0.25)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        float: "float 3s ease-in-out infinite",
        "scale-in": "scale-in 0.35s ease-out forwards",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, #fdf8f6 0%, #f9ede8 40%, #f5f5f4 100%)",
        "gradient-brand": "linear-gradient(135deg, #b86244 0%, #cc7a5c 100%)",
        "gradient-hero-dark": "linear-gradient(135deg, #1c1917 0%, #292524 50%, #1a1513 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
