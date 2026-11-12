/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obs: {
          bg: '#080B12',
          'bg-secondary': '#0D1420',
          panel: '#111B29',
          surface: '#162235',
          border: '#243247',
          'border-subtle': '#1A2536',
          accent: '#58A6FF',
          'accent-glow': '#58A6FF33',
          healthy: '#36D399',
          'healthy-glow': '#36D39933',
          warning: '#F5B942',
          'warning-glow': '#F5B94233',
          critical: '#FF5C67',
          'critical-glow': '#FF5C6733',
          'text-primary': '#E8EEF7',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B',
        },
        navy: {
          950: '#080B12',
          900: '#0D1420',
          850: '#111B29',
          800: '#162235',
          750: '#1A2536',
          700: '#243247',
          600: '#334460',
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
          'SF Mono',
          'Menlo',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(36, 50, 71, 0.6)',
        'panel-accent': '0 0 0 1px #58A6FF40, 0 8px 24px -4px rgba(88, 166, 255, 0.15)',
        'status-pulse': '0 0 8px currentColor',
      },
      animation: {
        'radar-sweep': 'sweep 4s linear infinite',
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};
