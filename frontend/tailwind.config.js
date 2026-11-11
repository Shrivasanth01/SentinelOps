/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0e1629',
          800: '#131e38',
          750: '#182442',
          700: '#1e2d4f',
          600: '#2a3e68',
        },
        sentinel: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          indigo: '#6366f1',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Menlo',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};

