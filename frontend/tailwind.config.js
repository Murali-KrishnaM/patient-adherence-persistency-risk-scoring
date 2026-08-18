/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#040705',
          900: '#090D0A',
          850: '#0F1612',
          800: '#15201A',
          750: '#1B2B23',
          700: '#23382D',
          600: '#2E4A3B'
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
          glow: '#00FF9D'
        },
        risk: {
          high: '#F87171',
          highBg: 'rgba(239, 68, 68, 0.15)',
          med: '#FBBF24',
          medBg: 'rgba(245, 158, 11, 0.15)',
          low: '#34D399',
          lowBg: 'rgba(16, 185, 129, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-float': 'subtleFloat 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)' },
        },
        subtleFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
