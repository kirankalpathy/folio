import type {
  AllocationSlice,
  AssetClassKey,
  CategoryTotals,
  CompoundingFrequency,
  NetWorthSummary,
  PortfolioSnapshot,
} from '../types';
import { ASSET_CLASS_KEYS } from '../types';
import { isPortfolioDeposit, summarizeDeposits } from './deposits';

export type NumberFormatId = 'en-IN' | 'en-US' | 'de-DE' | 'fr-FR-space-dot' | 'fr-FR-space-comma' | 'de-CH';

export const NumberWordSystem = {
  Indian: 'indian',
  International: 'international',
} as const;
export type NumberWordSystem = (typeof NumberWordSystem)[keyof typeof NumberWordSystem];

export function getNumberWordSystem(cfg: NumberFormatConfig = activeNumberFormat): NumberWordSystem {
  return cfg.indianGrouping ? NumberWordSystem.Indian : NumberWordSystem.International;
}

const BELOW_TWENTY = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsBelowThousand(n: number): string {
  let num = Math.floor(Math.abs(n));
  const parts: string[] = [];
  const hundreds = Math.floor(num / 100);
  const rest = num % 100;
  if (hundreds > 0) parts.push(`${BELOW_TWENTY[hundreds]} Hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(BELOW_TWENTY[rest] ?? '');
    else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(one ? `${TENS[ten]} ${BELOW_TWENTY[one]}` : (TENS[ten] ?? ''));
    }
  }
  return parts.join(' ').trim();
}

function toIndianWords(n: number): string {
  let num = Math.floor(Math.abs(n));
  if (num === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundredRest = num;
  if (crore) parts.push(`${wordsBelowThousand(crore)} ${crore === 1 ? 'Crore' : 'Crores'}`);
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} ${lakh === 1 ? 'Lakh' : 'Lakhs'}`);
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (hundredRest) parts.push(wordsBelowThousand(hundredRest));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function toInternationalWords(n: number): string {
  let num = Math.floor(Math.abs(n));
  if (num === 0) return 'Zero';
  const scales = [
    { value: 1_000_000_000, name: 'Billion' },
    { value: 1_000_000, name: 'Million' },
    { value: 1_000, name: 'Thousand' },
  ];
  const parts: string[] = [];
  for (const scale of scales) {
    const qty = Math.floor(num / scale.value);
    if (qty > 0) {
      parts.push(`${wordsBelowThousand(qty)} ${scale.name}`);
      num %= scale.value;
    }
  }
  if (num > 0) parts.push(wordsBelowThousand(num));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function formatAmountInWords(value: number, system?: NumberWordSystem): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs === 0) return 'Zero';
  const rounded = Math.round(abs);
  const wordSystem = system ?? getNumberWordSystem();
  const words = wordSystem === NumberWordSystem.Indian ? toIndianWords(rounded) : toInternationalWords(rounded);
  return value < 0 ? `Minus ${words}` : words;
}

export interface NumberFormatConfig {
  id: NumberFormatId;
  label: string;
  group: string;
  decimal: string;
  indianGrouping: boolean;
}

export const NUMBER_FORMAT_OPTIONS: NumberFormatConfig[] = [
  { id: 'en-IN', label: '12,34,567.89', group: ',', decimal: '.', indianGrouping: true },
  { id: 'en-US', label: '1,234,567.89', group: ',', decimal: '.', indianGrouping: false },
  { id: 'de-DE', label: '1.234.567,89', group: '.', decimal: ',', indianGrouping: false },
  { id: 'fr-FR-space-dot', label: '1 234 567.89', group: '\u00A0', decimal: '.', indianGrouping: false },
  { id: 'fr-FR-space-comma', label: '1 234 567,89', group: '\u00A0', decimal: ',', indianGrouping: false },
  { id: 'de-CH', label: "1'234'567.89", group: "'", decimal: '.', indianGrouping: false },
];

const DEFAULT_NUMBER_FORMAT: NumberFormatConfig = NUMBER_FORMAT_OPTIONS[0]!;
let activeNumberFormat: NumberFormatConfig = DEFAULT_NUMBER_FORMAT;

export function getNumberFormat(): NumberFormatConfig {
  return activeNumberFormat;
}

export function setNumberFormat(id: NumberFormatId): void {
  activeNumberFormat = NUMBER_FORMAT_OPTIONS.find((o) => o.id === id) ?? DEFAULT_NUMBER_FORMAT;
}

export function getNumberFormatId(): NumberFormatId {
  return activeNumberFormat.id;
}

function groupInteger(intPart: string, cfg: NumberFormatConfig): string {
  const s = intPart.replace(/^0+(?=\d)/, '') || '0';
  if (cfg.indianGrouping) {
    if (s.length <= 3) return s;
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, cfg.group);
    return `${rest}${cfg.group}${last3}`;
  }
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.group);
}

export const MONEY_DECIMALS = 2;
export const PERCENT_DECIMALS = 2;

function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const d = Math.max(0, Math.floor(decimals));
  const factor = 10 ** d;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatNumber(value: number, decimals = MONEY_DECIMALS): string {
  if (!Number.isFinite(value)) return '—';
  const d = Math.max(0, Math.floor(decimals));
  const rounded = roundTo(Math.abs(value), d);
  const sign = value < 0 ? '-' : '';
  const fixed = rounded.toFixed(d);
  const [intPart = '0', decPart] = fixed.split('.');
  const grouped = groupInteger(intPart, activeNumberFormat);
  return decPart ? `${sign}${grouped}${activeNumberFormat.decimal}${decPart}` : `${sign}${grouped}`;
}

export interface INRFormatOptions {
  decimals?: number;
  compact?: boolean;
  showSign?: boolean;
}

const COMPACT_UNITS = [
  { threshold: 1_00_00_000, divisor: 1_00_00_000, suffix: 'Cr' },
  { threshold: 1_00_000, divisor: 1_00_000, suffix: 'L' },
  { threshold: 1_000, divisor: 1_000, suffix: 'K' },
] as const;

function formatCompactAmount(value: number, decimals: number): string {
  const unit = COMPACT_UNITS.find((candidate) => value >= candidate.threshold);
  if (!unit) return formatNumber(value, decimals);
  return `${formatNumber(value / unit.divisor, decimals)} ${unit.suffix}`;
}

export function formatINR(value: number, options: INRFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—';
  const { decimals = MONEY_DECIMALS, compact = false, showSign = false } = options;
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';
  const absolute = Math.abs(value);
  if (compact) return `${sign}₹${formatCompactAmount(absolute, decimals)}`;
  return `${sign}₹${formatNumber(absolute, decimals)}`;
}

export function formatINRCompact(value: number): string {
  return formatINR(value, { compact: true, decimals: MONEY_DECIMALS });
}

export function formatPercent(value: number, decimals = PERCENT_DECIMALS): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatNumber(value, decimals)}%`;
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—';
  // preserve up to 4 decimals, trim trailing zeros for display
  const fixed = Math.abs(value).toFixed(4);
  const [i = '0', d = ''] = fixed.split('.');
  const trimmed = d.replace(/0+$/, '');
  const sign = value < 0 ? '-' : '';
  const grouped = groupInteger(i, activeNumberFormat);
  return trimmed ? `${sign}${grouped}${activeNumberFormat.decimal}${trimmed}` : `${sign}${grouped}`;
}

export const COMPOUNDING_PERIODS: Record<CompoundingFrequency, number> = {
  annual: 1,
  'semi-annual': 2,
  quarterly: 4,
  monthly: 12,
};

export interface CompoundInterestInput {
  principal: number;
  annualRate: number;
  years: number;
  compoundsPerYear?: number;
}

export interface CompoundInterestResult {
  maturityValue: number;
  interestEarned: number;
}

export function calculateCompoundInterest({
  principal,
  annualRate,
  years,
  compoundsPerYear = 1,
}: CompoundInterestInput): CompoundInterestResult {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRate) ||
    !Number.isFinite(years) ||
    principal <= 0 ||
    years <= 0
  ) {
    return { maturityValue: Math.max(0, principal || 0), interestEarned: 0 };
  }

  const periods = Math.max(1, Math.floor(compoundsPerYear));
  const ratePerPeriod = annualRate / 100 / periods;
  const maturityValue = principal * Math.pow(1 + ratePerPeriod, periods * years);

  return { maturityValue, interestEarned: maturityValue - principal };
}

export function calculateReturnsPercentage(invested: number, current: number): number {
  if (!Number.isFinite(invested) || !Number.isFinite(current) || invested <= 0) {
    return 0;
  }

  return ((current - invested) / invested) * 100;
}

interface CategoryAmounts {
  currentValue: number;
  investedValue: number;
  count: number;
}

function readCategory(key: AssetClassKey, snapshot: PortfolioSnapshot): CategoryAmounts {
  switch (key) {
    case 'stocks':
      return {
        currentValue: snapshot.stocks.reduce((sum, item) => sum + item.quantity * item.currentPrice, 0),
        investedValue: snapshot.stocks.reduce((sum, item) => sum + item.quantity * item.averageCost, 0),
        count: snapshot.stocks.length,
      };
    case 'bonds':
      return {
        currentValue: snapshot.bonds.reduce((sum, item) => sum + item.units * item.currentPrice, 0),
        investedValue: snapshot.bonds.reduce((sum, item) => sum + item.units * item.purchasePrice, 0),
        count: snapshot.bonds.length,
      };
    case 'pf':
      return {
        currentValue: snapshot.pfAccounts.reduce((sum, item) => sum + item.currentBalance, 0),
        investedValue: snapshot.pfAccounts.reduce((sum, item) => sum + item.totalContributed, 0),
        count: snapshot.pfAccounts.length,
      };
    case 'deposits': {
      const portfolioDeposits = snapshot.deposits.filter((item) => isPortfolioDeposit(item));
      return {
        currentValue: portfolioDeposits.reduce((sum, item) => sum + item.currentValue, 0),
        investedValue: portfolioDeposits.reduce((sum, item) => sum + item.principal, 0),
        count: portfolioDeposits.length,
      };
    }
    case 'commodities':
      return {
        currentValue: snapshot.commodities.reduce(
          (sum, item) => sum + item.quantity * item.currentPricePerUnit,
          0,
        ),
        investedValue: snapshot.commodities.reduce(
          (sum, item) => sum + item.quantity * item.averageCostPerUnit,
          0,
        ),
        count: snapshot.commodities.length,
      };
    case 'debts':
      return {
        currentValue: snapshot.debts.reduce((sum, item) => sum + item.outstandingPrincipal, 0),
        investedValue: snapshot.debts.reduce((sum, item) => sum + item.originalPrincipal, 0),
        count: snapshot.debts.length,
      };
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

export function calculateCategoryTotals(
  key: AssetClassKey,
  snapshot: PortfolioSnapshot,
): CategoryTotals {
  const { currentValue, investedValue, count } = readCategory(key, snapshot);
  const isLiability = key === 'debts';
  const gain = isLiability ? investedValue - currentValue : currentValue - investedValue;
  const gainPercentage = isLiability
    ? investedValue > 0
      ? (gain / investedValue) * 100
      : 0
    : calculateReturnsPercentage(investedValue, currentValue);

  return { currentValue, investedValue, gain, gainPercentage, count };
}

export function aggregateNetWorth(snapshot: PortfolioSnapshot): NetWorthSummary {
  const categories = {} as Record<AssetClassKey, CategoryTotals>;
  const counts = {} as Record<AssetClassKey, number>;

  for (const key of ASSET_CLASS_KEYS) {
    const totals = calculateCategoryTotals(key, snapshot);
    categories[key] = totals;
    counts[key] = totals.count;
  }

  const assetKeys = ASSET_CLASS_KEYS.filter((key) => key !== 'debts');
  const totalAssets = assetKeys.reduce((sum, key) => sum + categories[key].investedValue, 0);
  const totalLiabilities = categories.debts.currentValue;
  const portfolioDeposits = snapshot.deposits.filter((item) => isPortfolioDeposit(item));
  const depositSummary = summarizeDeposits(snapshot.deposits);
  const realizedGain = depositSummary.realizedGain;
  const unrealisedGain = depositSummary.unrealizedGain;
  const totalGain = realizedGain + unrealisedGain;

  const allocationBase = assetKeys.reduce((sum, key) => sum + categories[key].currentValue, 0);
  const allocations: AllocationSlice[] = [];
  for (const key of ASSET_CLASS_KEYS) {
    if (key === 'deposits') {
      // One allocation slice per deposit type (enum), using portfolio deposits only (excludes matured & pre-closed).
      const depositTypeGroups: Array<{ key: AllocationSlice['key']; type: string }> = [
        { key: 'deposits-fd', type: 'fd' },
        { key: 'deposits-rd', type: 'rd' },
        { key: 'deposits-tax-saving', type: 'tax-saving' },
        { key: 'deposits-savings', type: 'savings' },
        { key: 'deposits-nsc', type: 'nsc' },
        { key: 'deposits-scss', type: 'scss' },
        { key: 'deposits-other', type: 'other' },
      ];
      for (const g of depositTypeGroups) {
        const items = portfolioDeposits.filter((d) => (d.accountType ?? 'other') === g.type);
        if (items.length === 0) continue;
        const value = items.reduce((sum, item) => sum + (item.currentValue ?? 0), 0);
        allocations.push({
          key: g.key,
          value,
          percentage: allocationBase > 0 ? (Math.max(0, value) / allocationBase) * 100 : 0,
          count: items.length,
          kind: 'asset',
        });
      }
      continue;
    }
    allocations.push({
      key,
      value: categories[key].currentValue,
      percentage:
        allocationBase > 0 ? (Math.max(0, categories[key].currentValue) / allocationBase) * 100 : 0,
      count: categories[key].count,
      kind: key === 'debts' ? 'liability' : 'asset',
    });
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    realizedGain,
    unrealisedGain,
    totalGain,
    returnsPercentage: calculateReturnsPercentage(totalAssets, totalAssets + totalGain),
    categories,
    allocations,
    counts,
    isEmpty: ASSET_CLASS_KEYS.every((key) => counts[key] === 0),
  };
}
