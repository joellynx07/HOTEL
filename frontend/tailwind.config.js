/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: withOpacity("--bg"), elevated: withOpacity("--bg-elevated"), inset: withOpacity("--bg-inset") },
        fg: { DEFAULT: withOpacity("--fg"), muted: withOpacity("--fg-muted"), subtle: withOpacity("--fg-subtle") },
        border: { DEFAULT: withOpacity("--border"), strong: withOpacity("--border-strong") },
        accent: { DEFAULT: withOpacity("--accent"), fg: withOpacity("--accent-fg"), soft: withOpacity("--accent-soft") },
      },
      borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)" },
      fontFamily: { sans: ["'Inter var'", "Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
