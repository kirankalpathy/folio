import dayjs from 'dayjs';
import type { CompoundingFrequency, DepositHolding } from '../types';
import { calculateCompoundInterest, calculateReturnsPercentage, COMPOUNDING_PERIODS } from './finance';
import { daysUntil } from './date';

export interface DepositSummary {
  totalCurrentValue: number;
  totalPrincipal: number;
  accruedGain: number;
  gainPercentage: number;
  weightedAverageRate: number;
  maturingSoon: number;
  count: number;
}

export type DepositLifecycleStatus = 'planned' | 'active' | 'matured' | 'pre-closed' | 'in-lien';

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
  return parts.length > 0 ? parts.join(' ') : '0 days';
}

export interface DepositComputedValues {
  interest: number;
  realizedValue: number;
}

export function calculateDepositValues(input: {
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  cumulativeInterest: boolean;
  compoundingFrequency?: CompoundingFrequency;
}): DepositComputedValues {
  const principal = Number.isFinite(input.principal) ? Math.max(0, input.principal) : 0;
  const rate = Number.isFinite(input.interestRate) ? Math.max(0, input.interestRate) : 0;
  const start = dayjs(input.startDate);
  const maturity = dayjs(input.maturityDate);
  if (!principal || !rate || !start.isValid() || !maturity.isValid() || !maturity.isAfter(start)) {
    return { interest: 0, realizedValue: principal };
  }
  const years = maturity.diff(start, 'day') / 365;
  if (years <= 0) return { interest: 0, realizedValue: principal };

  if (input.cumulativeInterest) {
    const compoundsPerYear = COMPOUNDING_PERIODS[input.compoundingFrequency ?? 'quarterly'] ?? 4;
    const result = calculateCompoundInterest({ principal, annualRate: rate, years, compoundsPerYear });
    const interest = Math.max(0, result.interestEarned);
    return { interest, realizedValue: principal + interest };
  }

  const interest = Math.max(0, (principal * rate * years) / 100);
  return { interest, realizedValue: principal + interest };
}

export function summarizeDeposits(
  deposits: DepositHolding[],
  asOf: Date = new Date(),
): DepositSummary {
  const totalCurrentValue = deposits.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPrincipal = deposits.reduce((sum, item) => sum + item.principal, 0);
  const weightedRateBase = deposits.reduce(
    (sum, item) => sum + item.principal * item.interestRate,
    0,
  );
  const maturingSoon = deposits.filter((item) => {
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
    count: deposits.length,
  };
}
