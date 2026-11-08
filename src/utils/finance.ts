import type {
  AllocationSlice,
  AssetClassKey,
  CategoryTotals,
  CompoundingFrequency,
  NetWorthSummary,
  PortfolioSnapshot,
} from '../types';
import { ASSET_CLASS_KEYS } from '../types';

export type NumberFormatId = 'en-IN' | 'en-US' | 'de-DE' | 'fr-FR-space-dot' | 'fr-FR-space-comma' | 'de-CH';

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

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const fixed = abs.toFixed(Math.max(0, Math.floor(decimals)));
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
  if (!unit) return formatNumber(value, Math.min(decimals, 2));
  return `${formatNumber(value / unit.divisor, decimals)} ${unit.suffix}`;
}

export function formatINR(value: number, options: INRFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—';
  const { decimals = 0, compact = false, showSign = false } = options;
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';
  const absolute = Math.abs(value);
  if (compact) return `${sign}₹${formatCompactAmount(absolute, decimals)}`;
  return `${sign}₹${formatNumber(absolute, Math.max(0, Math.floor(decimals)))}`;
}

export function formatINRCompact(value: number): string {
  return formatINR(value, { compact: true, decimals: 2 });
}

export function formatPercent(value: number, decimals = 1): string {
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
    case 'deposits':
      return {
        currentValue: snapshot.deposits.reduce((sum, item) => sum + item.currentValue, 0),
        investedValue: snapshot.deposits.reduce((sum, item) => sum + item.principal, 0),
        count: snapshot.deposits.length,
      };
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
  const totalAssets = assetKeys.reduce((sum, key) => sum + categories[key].currentValue, 0);
  const totalInvested = assetKeys.reduce((sum, key) => sum + categories[key].investedValue, 0);
  const totalLiabilities = categories.debts.currentValue;
  const unrealisedGain = totalAssets - totalInvested;

  const allocations: AllocationSlice[] = ASSET_CLASS_KEYS.map((key) => ({
    key,
    value: categories[key].currentValue,
    percentage:
      totalAssets > 0 ? (Math.max(0, categories[key].currentValue) / totalAssets) * 100 : 0,
    count: categories[key].count,
    kind: key === 'debts' ? 'liability' : 'asset',
  }));

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalInvested,
    unrealisedGain,
    returnsPercentage: calculateReturnsPercentage(totalInvested, totalAssets),
    categories,
    allocations,
    counts,
    isEmpty: ASSET_CLASS_KEYS.every((key) => counts[key] === 0),
  };
}
