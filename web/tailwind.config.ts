import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 配色正本：项目二/design/UIUX配色规范-碳黑钴蓝-v1.md
        background: "var(--background)",
        foreground: "var(--foreground)",
        carbon: {
          950: "var(--carbon-950)",
          900: "var(--carbon-900)",
          850: "var(--carbon-850)",
          800: "var(--carbon-800)",
          700: "var(--carbon-700)",
          600: "var(--carbon-600)",
        },
        cobalt: {
          900: "var(--cobalt-900)",
          800: "var(--cobalt-800)",
          700: "var(--cobalt-700)",
          600: "var(--cobalt-600)",
          500: "var(--cobalt-500)",
          400: "var(--cobalt-400)",
          300: "var(--cobalt-300)",
          150: "var(--cobalt-150)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        safe: "var(--safe)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
    },
  },
  plugins: [],
};
export default config;
