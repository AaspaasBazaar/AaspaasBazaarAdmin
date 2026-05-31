import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bazaar: {
          green: "#2EAA52",
          saffron: "#F7A33C",
          ink: "#0F172A",
          paper: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};

export default config;
