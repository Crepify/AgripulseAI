/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#050706',
          900: '#0a0d0c',
          850: '#0f1412',
          800: '#141c19',
          700: '#1b2622',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          glow: '#00ff87',
        },
        amber: {
          glow: '#f59e0b',
          gold: '#fbbf24',
          sand: '#e2d9c8',
        }
      },
      fontFamily: {
        display: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'spin 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'scanline': 'scanline 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scanline: {
          '0%': { top: '0%', opacity: 0.8 },
          '50%': { opacity: 1 },
          '100%': { top: '100%', opacity: 0.8 },
        }
      }
    },
  },
  plugins: [],
}
