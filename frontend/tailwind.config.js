import tailwindcssAnimate from "tailwindcss-animate";
import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      colors: {
        border: "rgba(59, 130, 246, 0.22)",
        input: "rgba(59, 130, 246, 0.22)",
        ring: "rgba(59, 130, 246, 0.35)",
        background: "rgba(5, 6, 15, 1)",
        foreground: "rgba(226, 232, 240, 0.98)",
        muted: {
          DEFAULT: "rgba(148, 163, 184, 0.2)",
          foreground: "rgba(148, 163, 184, 0.82)",
        },
        accent: {
          DEFAULT: "#60a5fa",
          foreground: "#0f172a",
        },
      },
      borderRadius: {
        xl: "1rem",
      },
      boxShadow: {
        "glow-blue": "0 24px 60px rgba(37, 99, 235, 0.28)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
