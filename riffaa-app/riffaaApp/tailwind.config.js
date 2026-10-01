/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by NativeWind CSS variables. They resolve per
        // theme with no `dark:` variants required.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--c-surface) / <alpha-value>)",
          2: "rgb(var(--c-surface-2) / <alpha-value>)",
        },
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          muted: "rgb(var(--c-ink-muted) / <alpha-value>)",
          subtle: "rgb(var(--c-ink-subtle) / <alpha-value>)",
        },
        // Decorative ghost numerals + hairline connectors.
        ghost: "rgb(var(--c-ghost) / <alpha-value>)",
        hairline: "rgb(var(--c-hairline) / <alpha-value>)",
        "on-brand": "rgb(var(--c-on-brand) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",

        // Kept for existing screens; `brand` also exposes the DEFAULT token so
        // new code can write `bg-brand`, `text-brand`, `border-brand`.
        riffaa: {
          orange: "#ff7849",
          slate: "#273444",
        },
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          50: "#fff1ea",
          100: "#ffe1d2",
          200: "#ffc3a8",
          300: "#ff9d75",
          400: "#ff8a5c",
          500: "#ff7849",
          600: "#f05a28",
          700: "#c94317",
          800: "#9c2c0e",
          900: "#4a1d0c",
        },
      },
      borderRadius: {
        // Mirrors `radii` in theme/tokens.ts. Everything is rounded.
        card: "28px",
        hero: "32px",
        pill: "999px",
      },
      fontFamily: {
        // Mirrors the families loaded in app/_layout.tsx / AppText.
        ar: ["IBMPlexSansArabic_400Regular"],
        "ar-light": ["IBMPlexSansArabic_300Light"],
        "ar-medium": ["IBMPlexSansArabic_500Medium"],
        "ar-semibold": ["IBMPlexSansArabic_600SemiBold"],
        "ar-bold": ["IBMPlexSansArabic_700Bold"],
      },
    },
  },
  plugins: [],
};
