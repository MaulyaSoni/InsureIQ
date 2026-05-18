import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        risk: {
          low:      '#16A34A',
          'low-bg': '#F0FDF4',
          medium:   '#D97706',
          'medium-bg': '#FFFBEB',
          high:     '#EA580C',
          'high-bg': '#FFF7ED',
          critical: '#DC2626',
          'critical-bg': '#FEF2F2',
        },
        // Brand — deep violet (intelligence, precision)
        brand: {
          50: "#EEEDFE",
          100: "#CECBF6",
          200: "#AFA9EC",
          300: "#8F86E3",
          400: "#7F77DD",
          500: "#6B63D4",
          600: "#534AB7",
          700: "#3C3489",
          800: "#26215C",
          900: "#160F30",
        },
        // AI output identity — teal
        ai: {
          DEFAULT: "#0891B2",
          light: "#ECFEFF",
          border: "#A5F3FC",
          dark: "#0E7490",
        },
        // Surface system
        surface: {
          page: "var(--surface-page)",
          card: "var(--surface-card)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          border: "var(--surface-border)",
          "border-strong": "var(--surface-border-strong)",
        },
        // Text system
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-brand": "var(--text-brand)",
        "text-ai": "var(--text-ai)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Syne", "Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        sm: ["12px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "22px" }],
        md: ["15px", { lineHeight: "24px" }],
        lg: ["16px", { lineHeight: "26px" }],
        xl: ["18px", { lineHeight: "28px" }],
        "2xl": ["20px", { lineHeight: "30px" }],
        "3xl": ["24px", { lineHeight: "34px" }],
        "4xl": ["30px", { lineHeight: "40px" }],
        hero: ["40px", { lineHeight: "50px" }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        'modal':   '0 20px 60px rgba(0,0,0,0.25)',
        'ai':      '0 0 0 1px rgba(8,145,178,0.2), 0 4px 16px rgba(8,145,178,0.08)',
        'brand':   '0 0 0 1px rgba(83,74,183,0.2), 0 4px 16px rgba(83,74,183,0.08)',
        'inset':   'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in':    'scaleIn 0.2s ease-out',
        'pulse-ai':    'pulseAI 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s ease-in-out infinite',
        'cursor-blink':'cursorBlink 1s step-end infinite',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseAI:   { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        cursorBlink: { '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
