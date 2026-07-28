import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        institutional: {
          primary: "#003891",
          secondary: "#a6a7a9",
          black: "#000000",
          darkblue: "#09226f",
          blue: "#567cc6",
          lightblue: "#86a2da",
          extralightblue: "#b7c8e8"
        }
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
