import dayjs from 'dayjs';
import type { CompoundingFrequency, DepositHolding, DepositPayoutFrequency, DepositType } from '../types';
import { calculateCompoundInterest, calculateReturnsPercentage, COMPOUNDING_PERIODS } from './finance';
import { daysUntil } from './date';

export const PAYOUTS_PER_YEAR: Record<DepositPayoutFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  annual: 1,
};

export interface DepositSummary {
  totalCurrentValue: number;
  totalPrincipal: number;
  accruedGain: number;
  gainPercentage: number;
  weightedAverageRate: number;
  maturingSoon: number;
  count: number;
}

export const DepositLifecycleStatus = {
  Planned: 'planned',
  Active: 'active',
  Matured: 'matured',
  PreClosed: 'pre-closed',
  InLien: 'in-lien',
} as const;
export type DepositLifecycleStatus = (typeof DepositLifecycleStatus)[keyof typeof DepositLifecycleStatus];

/** Closed/reference-only statuses: excluded from portfolio/principal/stat calculations across the app. */
export const CLOSED_DEPOSIT_STATUSES: ReadonlySet<DepositLifecycleStatus> = new Set([DepositLifecycleStatus.Matured, DepositLifecycleStatus.PreClosed]);

export function isClosedDepositStatus(status: DepositLifecycleStatus | null | undefined): boolean {
  return status != null && CLOSED_DEPOSIT_STATUSES.has(status);
}

/** True for deposits that count toward portfolio value/principal/stats (excludes matured & pre-closed). */
export function isPortfolioDeposit(
  input: { startDate: string; maturityDate: string; preClosedDate?: string; markedAsLien?: boolean },
  asOf: Date = new Date(),
): boolean {
  return !isClosedDepositStatus(getDepositLifecycleStatus(input, asOf));
}

export function getDepositLifecycleStatus(input: {
  startDate: string;
  maturityDate: string;
  preClosedDate?: string;
  markedAsLien?: boolean;
}, asOf: Date = new Date()): DepositLifecycleStatus | null {
  if (input.markedAsLien) return 'in-lien';
  if (input.preClosedDate) return 'pre-closed';
  const start = dayjs(input.startDate);
  const maturity = dayjs(input.maturityDate);
  if (!start.isValid() || !maturity.isValid()) return null;
  const today = dayjs(asOf).startOf('day');
  if (maturity.isBefore(today, 'day')) return 'matured';
  if (start.isAfter(today, 'day') && maturity.isAfter(today, 'day')) return 'planned';
  if ((start.isBefore(today, 'day') || start.isSame(today, 'day')) && maturity.isAfter(today, 'day')) return 'active';
  if (start.isAfter(today, 'day')) return 'planned';
  return 'active';
}

export function formatDepositTenure(startDate?: string, maturityDate?: string): string | null {
  if (!startDate || !maturityDate) return null;
  const start = dayjs(startDate);
  const end = dayjs(maturityDate);
  if (!start.isValid() || !end.isValid() || !end.isAfter(start, 'day')) return null;
  const totalDays = end.diff(start, 'day');
  let years = end.diff(start, 'year');
  const afterYears = start.add(years, 'year');
  let months = end.diff(afterYears, 'month');
  const afterMonths = afterYears.add(months, 'month');
  let days = end.diff(afterMonths, 'day');
  // normalize rare day borrowing edge cases
  if (days < 0) { months -= 1; days = end.diff(afterYears.add(months, 'month'), 'day'); }
  if (months < 0) { years -= 1; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  const breakdown = parts.length > 0 ? parts.join(' ') : '0 days';
  return `${breakdown} (${totalDays} ${totalDays === 1 ? 'day' : 'days'})`;
}

export interface DepositComputedValues {
  /** Interest earned (compound interest for cumulative/RD; total simple interest for non-cumulative payout FD). */
  interest: number;
  /** Maturity value (FD cumulative: principal+interest; FD non-cumulative payout: principal; RD: recurringAmount*months + interest). */
  realizedValue: number;
  /** Total amount deposited/invested (FD: principal; RD: recurringAmount * months). */
  totalDeposited: number;
  /** Number of monthly installments/months for RD; 0 for FD. */
  months: number;
  /** Periodic interest payout/credit amount for non-cumulative FD/RD-like payout cases (optional). */
  interestPayoutAmount?: number;
}

function calculateRdMaturityValue(
  recurringAmount: number,
  annualRatePercent: number,
  months: number,
  compoundingFrequency?: CompoundingFrequency,
): number {
  if (recurringAmount <= 0 || annualRatePercent <= 0 || months <= 0) return recurringAmount * Math.max(0, months);
  const r = annualRatePercent / 100;
  if (compoundingFrequency === 'monthly') {
    // Monthly deposits compounded monthly (annuity due approximation): M = R*(1+i)*((1+i)^n - 1)/i
    const i = r / 12;
    if (i === 0) return recurringAmount * months;
    return recurringAmount * (1 + i) * ((Math.pow(1 + i, months) - 1) / i);
  }
  // Default: quarterly compounding with monthly deposits (standard Indian RD formula).
  const i = r / 4;
  if (i === 0) return recurringAmount * months;
  const q = months / 3;
  const onePlusI = 1 + i;
  const denom = 1 - Math.pow(onePlusI, -1 / 3);
  if (Math.abs(denom) < 1e-12) return recurringAmount * months;
  return recurringAmount * ((Math.pow(onePlusI, q) - 1) / denom);
}

export function calculateDepositValues(input: {
  accountType?: DepositType;
  principal: number;
  recurringAmount?: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  cumulativeInterest: boolean;
  compoundingFrequency?: CompoundingFrequency;
  payoutFrequency?: DepositPayoutFrequency;
}): DepositComputedValues {
  const rate = Number.isFinite(input.interestRate) ? Math.max(0, input.interestRate) : 0;
  const start = dayjs(input.startDate);
  const maturity = dayjs(input.maturityDate);

  if (input.accountType === 'rd') {
    const recurringAmount = Number.isFinite(input.recurringAmount) ? Math.max(0, input.recurringAmount as number) : 0;
    if (!recurringAmount || !start.isValid() || !maturity.isValid() || !maturity.isAfter(start)) {
      const months = start.isValid() && maturity.isValid() ? Math.max(0, maturity.diff(start, 'month')) : 0;
      const totalDeposited = recurringAmount * months;
      return { interest: 0, realizedValue: totalDeposited, totalDeposited, months };
    }
    const months = Math.max(0, maturity.diff(start, 'month'));
    const totalDeposited = recurringAmount * months;
    if (!rate || months <= 0) return { interest: 0, realizedValue: totalDeposited, totalDeposited, months };
    // RD is cumulative (compound interest) by default.
    const maturityValue = calculateRdMaturityValue(recurringAmount, rate, months, input.compoundingFrequency ?? 'quarterly');
    const interest = Math.max(0, maturityValue - totalDeposited);
    return { interest, realizedValue: totalDeposited + interest, totalDeposited, months };
  }

  const principal = Number.isFinite(input.principal) ? Math.max(0, input.principal) : 0;
  if (!principal || !rate || !start.isValid() || !maturity.isValid() || !maturity.isAfter(start)) {
    return { interest: 0, realizedValue: principal, totalDeposited: principal, months: 0 };
  }
  const years = maturity.diff(start, 'day') / 365;
  if (years <= 0) return { interest: 0, realizedValue: principal, totalDeposited: principal, months: 0 };

  if (input.cumulativeInterest) {
    const compoundsPerYear = COMPOUNDING_PERIODS[input.compoundingFrequency ?? 'quarterly'] ?? 4;
    const result = calculateCompoundInterest({ principal, annualRate: rate, years, compoundsPerYear });
    const interest = Math.max(0, result.interestEarned);
    return { interest, realizedValue: principal + interest, totalDeposited: principal, months: 0 };
  }

  // Non-cumulative (interest payout): interest is paid out periodically; realized value reflects principal plus total interest over the tenure.
  const interest = Math.max(0, (principal * rate * years) / 100);
  const payoutsPerYear = input.payoutFrequency ? PAYOUTS_PER_YEAR[input.payoutFrequency] : undefined;
  const interestPayoutAmount = payoutsPerYear && payoutsPerYear > 0 ? (principal * rate) / 100 / payoutsPerYear : undefined;
  return { interest, realizedValue: principal + interest, totalDeposited: principal, months: 0, interestPayoutAmount };
}

export function summarizeDeposits(
  deposits: DepositHolding[],
  asOf: Date = new Date(),
): DepositSummary {
  // Matured & pre-closed deposits are reference-only; exclude from portfolio/principal calculations.
  const portfolio = deposits.filter((item) => isPortfolioDeposit(item, asOf));
  const totalCurrentValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPrincipal = portfolio.reduce((sum, item) => sum + item.principal, 0);
  const weightedRateBase = portfolio.reduce(
    (sum, item) => sum + item.principal * item.interestRate,
    0,
  );
  const maturingSoon = portfolio.filter((item) => {
    if (getDepositLifecycleStatus(item, asOf) !== 'active') return false;
    const days = daysUntil(item.maturityDate, asOf);
    return Number.isFinite(days) && days >= 0 && days <= 90;
  }).length;

  return {
    totalCurrentValue,
    totalPrincipal,
    accruedGain: totalCurrentValue - totalPrincipal,
    gainPercentage: calculateReturnsPercentage(totalPrincipal, totalCurrentValue),
    weightedAverageRate: totalPrincipal > 0 ? weightedRateBase / totalPrincipal : 0,
    maturingSoon,
    count: portfolio.length,
  };
}
