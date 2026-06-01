import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-bricolage)", "system-ui", "sans-serif"],
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      colors: {
        // Brand greens (sidebar / actions)
        ink: {
          900: "#06160E",
          800: "#0F2419",
          700: "#15321F",
          600: "#16241D",
          500: "#1E4030",
          400: "#16352B",
        },
        sage: {
          50: "#F4F7F4",
          100: "#EEF2EF",
          200: "#E5EAE6",
          300: "#CDD6D0",
          400: "#A8C4B5",
          500: "#6E8A7A",
          600: "#6B7771",
        },
        leaf: {
          50: "#E7F4ED",
          100: "#E9F6EE",
          200: "#bfe0cd",
          400: "#2EB36A",
          500: "#2E9E4F",
          600: "#1B8A5A",
          700: "#13653F",
          800: "#3AA856",
        },
        // Accent palettes for category badges + stat icons
        ocean:  { 50: "#E4ECF7", 400: "#4FA3C7", 600: "#3B6FB0" },
        aqua:   { 50: "#E3F5F2", 400: "#2BB3A3" },
        amber:  { 50: "#FBF1DC", 600: "#C98A11" },
        orange: { 50: "#FDEEE7", 600: "#F0682E" },
        rose:   { 50: "#FBE9F1", 600: "#E26FA0" },
        ruby:   { 600: "#C5453B" },
        // App background
        canvas: "#DCE5DE",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 36, 25, 0.04)",
      },
      borderRadius: {
        card: "16px",
        panel: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
