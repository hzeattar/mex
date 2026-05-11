/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,html}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#060A14',
        panel: '#071126',
        'panel-2': '#0A1735',
        'panel-3': '#0D1F4A',
        line: 'rgba(129,160,220,0.16)',
        'line-strong': 'rgba(129,160,220,0.28)',
        accent: '#5d7cff',
        'accent-soft': 'rgba(93,124,255,0.18)',
        green: '#24d28d',
        'green-soft': 'rgba(36,210,141,0.14)',
        red: '#ff5c7c',
        'red-soft': 'rgba(255,92,124,0.14)',
        muted: 'rgba(200,220,255,0.58)',
        text: '#e8f0ff',
        gold: '#f7b731',
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '18px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 16px 48px rgba(2,8,20,0.32), inset 0 1px 0 rgba(255,255,255,0.04)',
        glow: '0 0 24px rgba(93,124,255,0.22)',
        'glow-green': '0 0 20px rgba(36,210,141,0.2)',
      },
      backdropBlur: { xs: '4px' },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
