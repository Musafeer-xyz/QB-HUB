import type { Config } from "tailwindcss";

/**
 * Design tokens for the workspace UI. The printed paper does not use any of
 * these — its stylesheet is black on white by contract (see globals.css).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F5F2",
        surface: "#FFFFFF",
        line: "#E7E4DD",
        ink: "#1F2430",
        muted: "#6B7280",
        primary: {
          DEFAULT: "#1E40AF",
          hover: "#1B3A9A",
          soft: "#EEF1FA",
        },
        danger: {
          DEFAULT: "#B42318",
          soft: "#FEF3F2",
        },
        subject: {
          chemistry: "#0F9D8A",
          physics: "#2563EB",
          math: "#D97706",
          biology: "#16A34A",
        },
        tag: {
          sq: "#E6F4F1",
          "sq-text": "#0B6B5D",
          cq: "#FDF1DC",
          "cq-text": "#8A5300",
          mcq: "#EEE8FB",
          "mcq-text": "#5B3FB3",
        },
        /* Kept so older screens keep compiling while they are restyled. */
        brand: {
          50: "#EEF1FA",
          100: "#DCE3F5",
          200: "#BFCBEC",
          300: "#96A9DE",
          400: "#6B84CD",
          500: "#3F5FBA",
          600: "#1E40AF",
          700: "#1B3A9A",
          800: "#182F7D",
          900: "#162960",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "8px",
        lg: "8px",
        xl: "12px",
        "2xl": "12px",
      },
      boxShadow: {
        /* Borders replace shadows in the app; only popovers/dialogs lift. */
        pop: "0 8px 24px rgba(31, 36, 48, 0.12)",
        dialog: "0 24px 64px rgba(31, 36, 48, 0.18)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.6" }],
        sm: ["13px", { lineHeight: "1.65" }],
        base: ["15px", { lineHeight: "1.7" }],
      },
    },
  },
  plugins: [],
};

export default config;
