import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15252c",
        muted: "#718087",
        canvas: "#f4f7f6",
        teal: "#0f766e",
        mint: "#dff5ee",
        coral: "#e86f51",
        amber: "#d89b2b"
      },
      boxShadow: {
        card: "0 10px 30px rgba(25, 55, 56, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
