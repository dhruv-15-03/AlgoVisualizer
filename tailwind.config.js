/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceff3',
          200: '#d4dae3',
          300: '#a8b3c4',
          400: '#7280a0',
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
        ok: '#4ade80',
        warn: '#facc15',
        danger: '#f87171',
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
