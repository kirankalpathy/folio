/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'folio-primary': '#C8502D',
        'folio-ink': '#2A1A14',
        'folio-paper': '#FFFFFF',
        'folio-accent': '#E19F8C',
        'folio-night': '#141414',
        'folio-dark-surface': '#1E1E1E',
        'folio-info': {
          bg: 'var(--folio-info-bg)',
          border: 'var(--folio-info-border)',
          accent: 'var(--folio-info-accent)',
          text: 'var(--folio-info-text)',
        },
        'folio-success': {
          bg: 'var(--folio-success-bg)',
          border: 'var(--folio-success-border)',
          accent: 'var(--folio-success-accent)',
          text: 'var(--folio-success-text)',
        },
        'folio-warning': {
          bg: 'var(--folio-warning-bg)',
          border: 'var(--folio-warning-border)',
          accent: 'var(--folio-warning-accent)',
          text: 'var(--folio-warning-text)',
        },
        'folio-error': {
          bg: 'var(--folio-error-bg)',
          border: 'var(--folio-error-border)',
          accent: 'var(--folio-error-accent)',
          text: 'var(--folio-error-text)',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Inter Variable"', 'system-ui', 'sans-serif'],
        // mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        mono: ['Inter', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        folio: '0 1px 2px rgba(42, 26, 20, 0.04), 0 12px 32px -20px rgba(42, 26, 20, 0.24)',
        'folio-lg': '0 2px 4px rgba(42, 26, 20, 0.06), 0 28px 56px -32px rgba(42, 26, 20, 0.42)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};
