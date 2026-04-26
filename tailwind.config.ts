import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surfaceStrong: "rgb(var(--surface-strong) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        primaryForeground: "rgb(var(--primary-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentForeground: "rgb(var(--accent-foreground) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        mutedForeground: "rgb(var(--muted-foreground) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 16px 40px -22px rgba(31, 48, 79, 0.22)",
        insetline: "inset 0 1px 0 rgba(255,255,255,0.35)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.85" }
        }
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        pulseGlow: "pulseGlow 2.2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;

