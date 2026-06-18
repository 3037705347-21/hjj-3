/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'console': {
          900: '#050c18',
          800: '#0a1628',
          700: '#0f1f36',
          600: '#162a47',
          500: '#1e3a5f',
          400: '#2d4f7c',
          300: '#4a7ab0',
          200: '#7aa5d4',
          100: '#b0cde8',
        },
        'harbor': {
          orange: '#ff6b35',
          cyan: '#00d4aa',
          red: '#ff4757',
          yellow: '#ffc107',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 12px rgba(255, 107, 53, 0.4)',
        'glow-cyan': '0 0 12px rgba(0, 212, 170, 0.4)',
        'glow-red': '0 0 12px rgba(255, 71, 87, 0.4)',
        'glow-blue': '0 0 12px rgba(74, 122, 176, 0.3)',
        'inner-grid': 'inset 0 0 0 1px rgba(74, 122, 176, 0.15)',
      },
      animation: {
        'pulse-red': 'pulseRed 1.5s ease-in-out infinite',
        'pulse-orange': 'pulseOrange 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'count-up': 'countUp 1s ease-out',
      },
      keyframes: {
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 71, 87, 0.7)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255, 71, 87, 0)' },
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.5)' },
          '50%': { boxShadow: '0 0 0 4px rgba(255, 107, 53, 0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
