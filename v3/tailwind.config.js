/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
        },
        success: '#10b981',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
