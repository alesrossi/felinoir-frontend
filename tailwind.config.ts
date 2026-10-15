import type { Config } from "tailwindcss";

// Per-script fallbacks (loaded in app/layout.tsx), tried in order for any
// character the primary font lacks. Han ideographs are shared by Chinese,
// Japanese and Korean, so SC is listed first: Chinese gets correct forms and
// Japanese still renders (its kana is in SC too). KR goes last for Hangul.
const scriptFallbacks = [
  "var(--font-noto)",
  "var(--font-noto-arabic)",
  "var(--font-noto-devanagari)",
  "var(--font-noto-sc)",
  "var(--font-noto-jp)",
  "var(--font-noto-kr)",
];

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy + cyan accent palette
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Project-specific navy palette
        navy: {
          50:  "#e8edf5",
          100: "#c5d0e6",
          200: "#9fb1d4",
          300: "#7891c2",
          400: "#5a79b4",
          500: "#3b61a6",
          600: "#2e4f8a",
          700: "#1e3460",
          800: "#121e3a",
          900: "#0a1124",
          950: "#060a16",
        },
        roman: {
          DEFAULT: "hsl(var(--roman) / <alpha-value>)",
          muted: "hsl(var(--roman-muted) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan))",
          foreground: "hsl(var(--cyan-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", ...scriptFallbacks, "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        serif: ["var(--font-cormorant)", "Georgia", "Times New Roman", ...scriptFallbacks, "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
