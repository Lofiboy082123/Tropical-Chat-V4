/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tropical: {
          bg: '#0b1220',
          card: '#111827',
          sidebar: '#0f172a',
          border: '#1e293b',
          teal: '#14b8a6',
          tealHover: '#0d9488',
          green: '#22c55e',
          red: '#ef4444',
          amber: '#f59e0b',
          muted: '#94a3b8',
        },
      },
    },
  },
  plugins: [],
};
