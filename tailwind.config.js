/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'folio-primary': '#C8502D',
        'folio-primary-hover': '#B44526',
        'folio-ink': '#2A1A14',
        'folio-cream': '#F7EFE9',
        'folio-paper': '#FFFFFF',
        'folio-shell': '#FBF8F6',
        'folio-accent': '#E19F8C',
        'folio-night': '#141414',
        'folio-dark-surface': '#1E1E1E',
        'folio-dark-elevated': '#262626',
        'folio-dark-header': '#1A1A1A',
        'folio-dark-text': '#F3F4F6',
        'folio-table-header': '#FAF6F3',
        'folio-table-hover': '#FDF6F4',
        'folio-table-hover-dark': '#2B1E1B',
        /* Theme role tokens (auto light/dark via CSS vars) */
        'folio-role-bg': 'var(--folio-role-bg)',
        'folio-role-bg-muted': 'var(--folio-role-bg-muted)',
        'folio-role-surface': 'var(--folio-role-surface)',
        'folio-role-text': 'var(--folio-role-text)',
        'folio-role-text-secondary': 'var(--folio-role-text-secondary)',
        'folio-role-text-muted': 'var(--folio-role-text-muted)',
        'folio-role-border': 'var(--folio-role-border)',
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
        'folio-toast': '0 18px 40px -18px rgba(42, 26, 20, 0.35), 0 8px 18px -10px rgba(42, 26, 20, 0.2)',
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
