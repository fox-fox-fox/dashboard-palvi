import type { Config } from "tailwindcss";

// Tokens definidos como triplete RGB en `src/styles/tokens.css` para que
// Tailwind v3 pueda aplicar alpha arbitraria (`bg-positive/10`, etc.).
const withAlpha = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: withAlpha("--color-bg"),
        surface: withAlpha("--color-surface"),
        "surface-2": withAlpha("--color-surface-2"),
        border: withAlpha("--color-border"),
        "border-strong": withAlpha("--color-border-strong"),
        text: withAlpha("--color-text"),
        "text-muted": withAlpha("--color-text-muted"),
        "text-subtle": withAlpha("--color-text-subtle"),
        accent: withAlpha("--color-accent"),
        positive: withAlpha("--color-positive"),
        negative: withAlpha("--color-negative"),
        warning: withAlpha("--color-warning"),
        info: withAlpha("--color-info"),
        "ds-a": withAlpha("--color-ds-a"),
        "ds-b": withAlpha("--color-ds-b"),
        "ds-c": withAlpha("--color-ds-c"),
        "ds-d": withAlpha("--color-ds-d"),
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        caption: ["11px", { lineHeight: "16px", letterSpacing: "0.04em" }],
        small: ["13px", { lineHeight: "18px" }],
        body: ["15px", { lineHeight: "22px" }],
        h3: ["18px", { lineHeight: "26px" }],
        h2: ["22px", { lineHeight: "30px" }],
        h1: ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        display: ["40px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
