/**
 * Central color palette for Folio. Use these tokens/constants instead of hardcoding hex/rgb in app code.
 * CSS theme tokens remain in `src/index.css` (:root / .dark). Tailwind tokens are in `tailwind.config.js`.
 */
export const palette = {
  primary: '#C8502D',
  primaryHover: '#B44526',
  primaryActive: '#9E3A1F',
  accent: '#E19F8C',
  ink: '#2A1A14',
  cream: '#F7EFE9',
  paper: '#FFFFFF',
  shell: '#FBF8F6',
  night: '#141414',
  darkSurface: '#1E1E1E',
  darkElevated: '#262626',
  darkTableHeader: '#1A1A1A',
  darkText: '#F3F4F6',
  lightTableHeader: '#FAF6F3',
  lightTableHover: '#FDF6F4',
  darkTableHover: '#2B1E1B',
  asset: {
    stocks: '#C8502D',
    bonds: '#E19F8C',
    pf: '#A15E43',
    deposits: '#F0C5B8',
    depositsFd: '#F0C5B8',
    depositsRd: '#E19F8C',
    depositsTaxSaving: '#D9A98B',
    depositsSavings: '#E8BFA8',
    depositsNsc: '#C48B73',
    depositsScss: '#B8745A',
    depositsOther: '#CFA08F',
    commodities: '#7B3E28',
    debts: '#6B4A3F',
  },
  tag: {
    savings: { base: '#14b8a6', text: '#0f766e' },
    nsc: { base: '#8b5cf6', text: '#6d28d9' },
    other: { base: '#64748b', text: '#475569' },
  },
  avatarOnPrimary: '#FFF7F2',
  onPrimary: '#FFF7F2',
  onError: '#FFF7F2',
  semanticLight: {
    info: '#1890FF',
    success: '#128937',
    warning: '#FA8C16',
    error: '#DB372D',
  },
  semanticDark: {
    info: '#3C9AE8',
    success: '#30B651',
    warning: '#F5A623',
    error: '#E5484D',
  },
} as const;

/** Fixed national/brand asset colors (kept central; not app theme tokens). */
export const INDIA_FLAG_COLORS = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
} as const;

export const CARD_NETWORK_COLORS: Record<string, string> = {
  VISA: '#1A1F71',
  MasterCard: '#EB001B',
  RuPay: '#0B3C6D',
  'American Express': '#2E77BC',
};

export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
