/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,html}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#060A14',
        surface: '#0b1426',
        panel: '#111d32',
        'panel-2': '#162847',
        line: 'rgba(129,160,220,0.12)',
        'line-strong': 'rgba(129,160,220,0.24)',
        accent: '#5d7cff',
        'accent-soft': 'rgba(93,124,255,0.12)',
        buy: '#00c087',
        'buy-soft': 'rgba(0,192,135,0.12)',
        sell: '#f6465d',
        'sell-soft': 'rgba(246,70,93,0.12)',
        spread: '#fcd535',
        green: '#00c087',
        red: '#f6465d',
        gold: '#fcd535',
        muted: 'rgba(200,220,255,0.55)',
        text: '#e8f0ff',
      },
      borderRadius: { DEFAULT: '8px', lg: '12px', xl: '16px' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
};
