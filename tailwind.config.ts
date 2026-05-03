import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#D9E3F0",
        input: "#D9E3F0",
        ring: "#1D4ED8",
        background: "#F4F7FB",
        foreground: "#0F172A",
        primary: {
          DEFAULT: "#165DCC",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#E8F0FB",
          foreground: "#12335B",
        },
        accent: {
          DEFAULT: "#D9F2E6",
          foreground: "#116149",
        },
        muted: {
          DEFAULT: "#EEF3F9",
          foreground: "#5B6B82",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Segoe UI", "Tahoma", "Geneva", "Verdana", "sans-serif"],
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(22, 93, 204, 0.18), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(236,244,255,0.96))",
      },
    },
  },
  plugins: [],
} satisfies Config;
