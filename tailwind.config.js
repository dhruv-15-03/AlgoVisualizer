/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceff3',
          200: '#d4dae3',
          300: '#a8b3c4',
          400: '#808da9', // muted text; clears WCAG AA (>=4.5:1) on ink-800 cards
          500: '#4a587a',
          600: '#34405e',
          700: '#222b44',
          800: '#161c2e',
          900: '#0b0f1c',
        },
        accent: {
          400: '#7c93ff',
          500: '#5b75ff',
          600: '#4159e6',
        },
        // Family-coded identity. Driven by the `--family-*-rgb` CSS custom
        // properties (see src/lib/family-palette.ts), which default to the
        // indigo accent in index.css so these tokens degrade gracefully when
        // no algorithm family is active. The `<alpha-value>` placeholder keeps
        // full Tailwind opacity-modifier support (e.g. `bg-family-accent/15`).
        family: {
          text: 'rgb(var(--family-text-rgb) / <alpha-value>)',
          accent: 'rgb(var(--family-accent-rgb) / <alpha-value>)',
          solid: 'rgb(var(--family-solid-rgb) / <alpha-value>)',
        },
        ok: '#4ade80',
        warn: '#facc15',
        danger: '#f87171',
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        'brand-orbit': 'brand-orbit 9s linear infinite',
        'brand-glow': 'brand-glow 3.2s ease-in-out infinite',
        'confetti-fall': 'confetti-fall 1700ms cubic-bezier(0.2, 0.6, 0.3, 1) forwards',
        'converge-pop': 'converge-pop 520ms cubic-bezier(0.18, 0.9, 0.28, 1.2) forwards',
        'celebrate-glow': 'celebrate-glow 1600ms ease-out forwards',
        'fade-in': 'fade-in 420ms ease-out both',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        'brand-orbit': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'brand-glow': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        'confetti-fall': {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: '1' },
          '100%': {
            transform: 'translate3d(var(--cx, 0), var(--cy, 120px), 0) rotate(var(--cr, 360deg))',
            opacity: '0',
          },
        },
        'converge-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'celebrate-glow': {
          '0%': { opacity: '0' },
          '25%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
