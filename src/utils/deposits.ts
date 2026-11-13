import dayjs from 'dayjs';
import type { CompoundingFrequency, DepositHolding, DepositPayoutFrequency, DepositType, InterestCreditAnchor } from '../types';
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
  realizedGain: number;
  unrealizedGain: number;
  gainPercentage: number;
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

export function sanitizeDepositLienState<T extends {
  markedAsLien?: boolean;
  preClosedDate?: string;
  preClosureCreditedValue?: number;
  lienReason?: string;
  accountType?: string;
}>(input: T): T {
  const markedAsLien = input.accountType === 'rd' ? false : Boolean(input.markedAsLien);
  if (markedAsLien) {
    return {
      ...input,
      markedAsLien: true,
      lienReason: input.lienReason?.trim() || undefined,
      preClosedDate: undefined,
      preClosureCreditedValue: undefined,
    };
  }
  return {
    ...input,
    markedAsLien: false,
    lienReason: undefined,
  };
}

export function getDepositLifecycleStatus(input: {
  startDate: string;
  maturityDate: string;
  preClosedDate?: string;
  markedAsLien?: boolean;
}, asOf: Date = new Date()): DepositLifecycleStatus | null {
  // Invariant: lien-active deposit cannot be matured/pre-closed until lien is closed.
  if (input.markedAsLien) return DepositLifecycleStatus.InLien;
  if (input.preClosedDate) return DepositLifecycleStatus.PreClosed;
  const start = dayjs(input.startDate);
  const maturity = dayjs(input.maturityDate);
  if (!start.isValid() || !maturity.isValid()) return null;
  const today = dayjs(asOf).startOf('day');
  if (maturity.isBefore(today, 'day')) return DepositLifecycleStatus.Matured;
  if (start.isAfter(today, 'day') && maturity.isAfter(today, 'day')) return DepositLifecycleStatus.Planned;
  if ((start.isBefore(today, 'day') || start.isSame(today, 'day')) && maturity.isAfter(today, 'day')) return DepositLifecycleStatus.Active;
  if (start.isAfter(today, 'day')) return DepositLifecycleStatus.Planned;
  return DepositLifecycleStatus.Active;
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
  /** Interest earned (compound interest for cumulative/RD; total simple interest for non-cumulative payout FD) over full tenure. */
  interest: number;
  /** Maturity/realized value over full tenure. */
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

function clampAsOfToTenure(startDate: string, maturityDate: string, asOf: Date = new Date()): dayjs.Dayjs | null {
  const start = dayjs(startDate).startOf('day');
  const maturity = dayjs(maturityDate).startOf('day');
  if (!start.isValid() || !maturity.isValid() || maturity.isBefore(start, 'day')) return null;
  const asOfDay = dayjs(asOf).startOf('day');
  if (asOfDay.isBefore(start, 'day')) return start;
  if (asOfDay.isAfter(maturity, 'day')) return maturity;
  return asOfDay;
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
  interestCreditAnchor?: InterestCreditAnchor | string;
  interestPayoutAmount?: number;
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
    const maturityValue = calculateRdMaturityValue(recurringAmount, rate, months, input.compoundingFrequency ?? 'quarterly');
    const interest = Math.max(0, maturityValue - totalDeposited);
    return { interest, realizedValue: totalDeposited + interest, totalDeposited, months };
  }

  const principal = Number.isFinite(input.principal) ? Math.max(0, input.principal) : 0;
  if (!principal || !rate || !start.isValid() || !maturity.isValid() || !maturity.isAfter(start)) {
    return { interest: 0, realizedValue: principal, totalDeposited: principal, months: 0 };
  }

  const isCumulative = input.cumulativeInterest;
  if (isCumulative) {
    const years = maturity.diff(start, 'day') / 365;
    if (years <= 0) return { interest: 0, realizedValue: principal, totalDeposited: principal, months: 0 };
    const n = COMPOUNDING_PERIODS[input.compoundingFrequency ?? 'quarterly'] ?? 4;
    const maturityValue = principal * Math.pow(1 + (rate / 100) / n, n * years);
    const interest = Math.max(0, maturityValue - principal);
    return { interest, realizedValue: principal + interest, totalDeposited: principal, months: 0 };
  }

  // Canonical non-cumulative engine: full-tenure expected interest from payout schedule/anchors/day-count rules.
  const periodic = periodicPayoutAmount({
    principal,
    interestRate: rate,
    payoutFrequency: input.payoutFrequency,
    interestPayoutAmount: input.interestPayoutAmount,
  } as Pick<DepositHolding, 'principal' | 'interestRate' | 'payoutFrequency' | 'interestPayoutAmount'>);
  const slots = buildPayoutSchedule(input.startDate, input.maturityDate, input.payoutFrequency, input.accountType, input.interestCreditAnchor);
  let interest = 0;
  if (slots.length > 0 && (periodic > 0 || (principal > 0 && rate > 0))) {
    interest = Math.max(0, slots.reduce((sum, s) => sum + slotPayoutAmount(s, periodic, principal, rate), 0));
  } else {
    const totalDays = maturity.diff(start, 'day');
    const basis = dayCountBasis(maturity, isScssAccountType(input.accountType));
    interest = totalDays > 0 ? Math.max(0, (principal * rate * totalDays) / 100 / basis) : 0;
  }
  return { interest, realizedValue: principal + interest, totalDeposited: principal, months: 0, interestPayoutAmount: periodic > 0 ? periodic : undefined };
}

export function calculateDepositAccruedValueAsOf(input: {
  accountType?: DepositType;
  principal: number;
  recurringAmount?: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  cumulativeInterest: boolean;
  compoundingFrequency?: CompoundingFrequency;
  payoutFrequency?: DepositPayoutFrequency;
  preClosedDate?: string;
  preClosureCreditedValue?: number;
  markedAsLien?: boolean;
}, asOf: Date = new Date()): number {
  const start = dayjs(input.startDate).startOf('day');
  const asOfDay = dayjs(asOf).startOf('day');
  if (!start.isValid()) return input.accountType === 'rd' ? 0 : Math.max(0, input.principal || 0);

  // Pre-closed (and lien not active): credited value if available, else accrued to pre-closure date.
  if (input.preClosedDate && !input.markedAsLien) {
    if (typeof input.preClosureCreditedValue === 'number' && Number.isFinite(input.preClosureCreditedValue)) {
      return Math.max(0, input.preClosureCreditedValue);
    }
    return calculateDepositAccruedValueAsOf({ ...input, preClosedDate: undefined, preClosureCreditedValue: undefined }, dayjs(input.preClosedDate).toDate());
  }

  if (asOfDay.isBefore(start, 'day')) {
    // Planned: no accrual before start.
    if (input.accountType === 'rd') return 0;
    return Math.max(0, input.principal || 0);
  }

  const capped = clampAsOfToTenure(input.startDate, input.maturityDate, asOfDay.toDate());
  if (!capped) {
    if (input.accountType === 'rd') return 0;
    return Math.max(0, input.principal || 0);
  }
  const maturity = dayjs(input.maturityDate).startOf('day');
  // If capped at/after maturity, full tenure value applies.
  if (!capped.isBefore(maturity, 'day')) {
    return calculateDepositValues({ ...input }).realizedValue;
  }

  if (input.accountType === 'rd') {
    const recurringAmount = Number.isFinite(input.recurringAmount) ? Math.max(0, input.recurringAmount as number) : 0;
    if (!recurringAmount) return 0;
    const monthsElapsed = Math.max(0, capped.diff(start, 'month'));
    const totalDeposited = recurringAmount * monthsElapsed;
    const rate = Number.isFinite(input.interestRate) ? Math.max(0, input.interestRate) : 0;
    if (!rate || monthsElapsed <= 0) return totalDeposited;
    const maturityValue = calculateRdMaturityValue(recurringAmount, rate, monthsElapsed, input.compoundingFrequency ?? 'quarterly');
    return Math.max(totalDeposited, maturityValue);
  }

  const principal = Number.isFinite(input.principal) ? Math.max(0, input.principal) : 0;
  const rate = Number.isFinite(input.interestRate) ? Math.max(0, input.interestRate) : 0;
  if (!principal) return 0;
  if (!rate) return principal;
  const years = capped.diff(start, 'day') / 365;
  if (years <= 0) return principal;
  if (input.cumulativeInterest) {
    const compoundsPerYear = COMPOUNDING_PERIODS[input.compoundingFrequency ?? 'quarterly'] ?? 4;
    const result = calculateCompoundInterest({ principal, annualRate: rate, years, compoundsPerYear });
    return principal + Math.max(0, result.interestEarned);
  }
  // Non-cumulative/payout (including SCSS): simple interest accrued to-date.
  const interest = Math.max(0, (principal * rate * years) / 100);
  return principal + interest;
}

export interface DepositDerivedValues {
  investedToDate: number;
  currentValue: number;
  realizedGain: number;
  unrealizedGain: number;
  totalInterest: number;
  totalReturns: number;
}

type PayoutAnchorMode = 'opening-date' | 'calendar';

export interface PayoutSlot {
  /** Payout date (day granularity) — realized once asOf >= this date. */
  date: dayjs.Dayjs;
  /** Actual days covered by this payout period (for daily pro-rata). */
  days: number;
  /** True when this slot represents a full payout period (not a pro-rated stub). */
  isFullPeriod: boolean;
  /** Day-count basis for daily pro-rata of this slot (365, or 366 for SCSS leap-year periods). */
  basis: number;
}

const CALENDAR_BOUNDARY_MONTHS: Record<string, number[]> = {
  quarterly: [2, 5, 8, 11], // Mar 31, Jun 30, Sep 30, Dec 31 (0-indexed)
  'semi-annual': [2, 8], // Mar 31, Sep 30
  annual: [2], // Mar 31 (financial year end)
};
const MONTHS_PER_PERIOD: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  'semi-annual': 6,
  annual: 12,
};

function normalizePayoutFrequency(freq?: DepositPayoutFrequency | 'half-yearly' | 'annually' | string): 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | undefined {
  switch (freq) {
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'semi-annual':
    case 'half-yearly': return 'semi-annual';
    case 'annual':
    case 'annually': return 'annual';
    default: return undefined;
  }
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isScssAccountType(accountType?: string): boolean {
  return accountType === 'scss';
}

/**
 * Day-count basis for daily pro-rata:
 * - SCSS (Post Office): Actual/366 in leap years, else Actual/365.
 * - Others: Actual/365.
 * Uses the period's end year for leap-year determination (covers periods spanning Feb 29).
 */
function dayCountBasis(periodEnd: dayjs.Dayjs, scss: boolean): number {
  if (!scss) return 365;
  // If the period crosses Feb 29 of a leap year, use 366; otherwise prefer end-year.
  const y = periodEnd.year();
  if (isLeapYear(y)) return 366;
  const prev = y - 1;
  if (isLeapYear(prev)) {
    const feb29 = dayjs(new Date(prev, 1, 29)).startOf('day');
    // Periods ending on/after Mar 1 of a non-leap year that started before Mar 1 could include Feb 29
    if (!periodEnd.isBefore(feb29, 'day') && periodEnd.isBefore(dayjs(new Date(y, 2, 1)), 'day')) return 366;
  }
  return 365;
}

/**
 * Anchor day-of-month from opening date, clamped to the last valid day of the target month.
 * For opening-date anchoring on 29th/30th/31st, clamps to last valid day of shorter months
 * without treating that month as partial/pro-rated (e.g. 31-Jan -> 28/29 Feb, 30 Apr).
 */
function openingDateAnchorInMonth(year: number, monthIdx: number, anchorDay: number): dayjs.Dayjs {
  const dim = new Date(year, monthIdx + 1, 0).getDate();
  return dayjs(new Date(year, monthIdx, Math.min(anchorDay, dim))).startOf('day');
}

function addOpeningPeriods(base: dayjs.Dayjs, periods: number, monthsPer: number, anchorDay: number): dayjs.Dayjs {
  const targetMonth = base.month() + periods * monthsPer;
  const y = base.year() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  return openingDateAnchorInMonth(y, m, anchorDay);
}

function monthEnd(year: number, monthIdx: number): dayjs.Dayjs {
  return dayjs(new Date(year, monthIdx + 1, 0)).startOf('day');
}

function getPayoutAnchorMode(
  freq: 'monthly' | 'quarterly' | 'semi-annual' | 'annual',
  accountType?: string,
  interestCreditAnchor?: InterestCreditAnchor | string,
): PayoutAnchorMode {
  // Monthly is always opening-date anchored. For non-monthly schemes the user-selected anchor applies.
  if (freq === 'monthly') return 'opening-date';
  if (interestCreditAnchor === 'financial-calendar') return 'calendar';
  if (interestCreditAnchor === 'account-opening-date') return 'opening-date';
  // Default: SCSS follows financial calendar; others default to account opening date.
  if (isScssAccountType(accountType)) return 'calendar';
  return 'opening-date';
}

/**
 * Build payout schedule for a non-cumulative deposit per the engine rules:
 * - Monthly: opening-date anchor (same day-of-month, clamped for 29/30/31). If maturity is not a whole month
 *   relative to the last anchor, interest is pro-rated from last anchor to maturity and paid at maturity.
 * - Financial calendar (quarterly/semi-annual/annual when selected): boundaries at quarter/half-year/year ends
 *   (Mar 31, Jun 30, Sep 30, Dec 31 / Mar 31, Sep 30 / Mar 31). Pro-rate opening->first anchor and
 *   last anchor->maturity when tenure is not aligned.
 * - Opening-date anchoring (monthly always, and non-monthly when selected): anchored to opening date every N months
 *   (clamped 29/30/31, not partial). If tenure is not a whole period, pro-rate last anchor -> maturity.
 * - Realized = completed payouts (payout date <= asOf). Full periods pay the periodic amount; pro-rated stubs use
 *   Actual/365 (or Actual/366 in leap years for SCSS).
 */
export function buildPayoutSchedule(
  startDate: string,
  maturityDate: string,
  frequency?: DepositPayoutFrequency | string,
  accountType?: string,
  interestCreditAnchor?: InterestCreditAnchor | string,
): PayoutSlot[] {
  const start = dayjs(startDate).startOf('day');
  const maturity = dayjs(maturityDate).startOf('day');
  if (!start.isValid() || !maturity.isValid() || !maturity.isAfter(start, 'day')) return [];
  const freq = normalizePayoutFrequency(frequency);
  if (!freq) return [];
  const scss = isScssAccountType(accountType);
  const mode = getPayoutAnchorMode(freq, accountType, interestCreditAnchor);
  const slots: PayoutSlot[] = [];

  if (mode === 'calendar' && (freq === 'quarterly' || freq === 'semi-annual' || freq === 'annual')) {
    const boundaryMonths = CALENDAR_BOUNDARY_MONTHS[freq] ?? [];
    // Collect calendar boundaries strictly after start and <= maturity
    const boundaries: dayjs.Dayjs[] = [];
    for (let y = start.year(); y <= maturity.year(); y++) {
      for (const m of boundaryMonths) {
        const b = monthEnd(y, m);
        if (b.isAfter(start, 'day') && !b.isAfter(maturity, 'day')) boundaries.push(b);
      }
    }
    boundaries.sort((a, b) => a.valueOf() - b.valueOf());
    let prev = start;
    for (const b of boundaries) {
      // First boundary may be a partial period from opening (pro-rated opening -> anchor)
      const days = b.diff(prev, 'day');
      // Determine if this is a full aligned calendar period: prev must be the previous same boundary
      const monthsPer = MONTHS_PER_PERIOD[freq] ?? 3;
      const expectedPrev = addOpeningPeriods(b, -1, monthsPer, 31); // previous boundary (month-end anchored)
      const isFull = prev.isSame(expectedPrev, 'day');
      slots.push({ date: b, days: Math.max(0, days), isFullPeriod: isFull, basis: dayCountBasis(b, scss) });
      prev = b;
    }
    // Final stub: anchor -> maturity if maturity falls between boundaries (paid at maturity)
    if (prev.isBefore(maturity, 'day')) {
      const days = maturity.diff(prev, 'day');
      slots.push({ date: maturity, days: Math.max(0, days), isFullPeriod: false, basis: dayCountBasis(maturity, scss) });
    }
    return slots;
  }

  // Opening-date anchoring (monthly always, and non-monthly when account-opening-date/default)
  const anchorDay = start.date();
  const monthsPer = MONTHS_PER_PERIOD[freq] ?? 1;
  let prev = start;
  for (let k = 1; ; k++) {
    const d = addOpeningPeriods(start, k, monthsPer, anchorDay);
    if (d.isAfter(maturity, 'day')) break;
    const days = d.diff(prev, 'day');
    // Opening-date anchor with 29/30/31 clamped to last valid day is NOT a partial/pro-rated month
    slots.push({ date: d, days: Math.max(0, days), isFullPeriod: true, basis: dayCountBasis(d, scss) });
    prev = d;
  }
  // If maturity is not a whole period relative to the last anchor, pro-rate last anchor -> maturity (paid at maturity)
  if (prev.isBefore(maturity, 'day')) {
    const days = maturity.diff(prev, 'day');
    slots.push({ date: maturity, days: Math.max(0, days), isFullPeriod: false, basis: dayCountBasis(maturity, scss) });
  }
  return slots;
}

/** Full-period payout amount for a non-cumulative deposit (authoritative if provided). */
function periodicPayoutAmount(
  item: Pick<DepositHolding, 'principal' | 'interestRate' | 'payoutFrequency' | 'interestPayoutAmount'>,
): number {
  if (typeof item.interestPayoutAmount === 'number' && Number.isFinite(item.interestPayoutAmount)) {
    return Math.max(0, item.interestPayoutAmount);
  }
  const freq = normalizePayoutFrequency(item.payoutFrequency);
  const perYear: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  const n = freq ? perYear[freq] ?? 0 : 0;
  const p = Number.isFinite(item.principal) ? Math.max(0, item.principal) : 0;
  const r = Number.isFinite(item.interestRate) ? Math.max(0, item.interestRate) : 0;
  return n > 0 && p > 0 && r > 0 ? (p * r) / 100 / n : 0;
}

function slotPayoutAmount(
  slot: PayoutSlot,
  periodicFull: number,
  principal: number,
  rate: number,
): number {
  if (slot.days <= 0) return 0;
  // Full periods pay the fixed periodic amount. Pro-rated (stub/partial) periods use daily pro-rata
  // with Actual/365 (or Actual/366 in leap years for SCSS) per the engine rules.
  if (slot.isFullPeriod) return periodicFull;
  return Math.max(0, (principal * rate * slot.days) / 100 / slot.basis);
}

export function getDepositDerivedValues(
  item: Pick<DepositHolding, 'accountType' | 'principal' | 'recurringAmount' | 'interestRate' | 'startDate' | 'maturityDate' | 'cumulativeInterest' | 'compoundingFrequency' | 'payoutFrequency' | 'interestCreditAnchor' | 'interestPayoutAmount' | 'preClosedDate' | 'preClosureCreditedValue' | 'markedAsLien'>,
  asOf: Date = new Date(),
): DepositDerivedValues {
  const rawAsOf = dayjs(asOf).startOf('day');
  const start = dayjs(item.startDate).startOf('day');
  const maturity = dayjs(item.maturityDate).startOf('day');
  const preClosed = item.preClosedDate ? dayjs(item.preClosedDate).startOf('day') : null;
  const effectivePreClose = preClosed && preClosed.isValid() && !item.markedAsLien ? preClosed : null;
  const asOfDay = effectivePreClose && effectivePreClose.isBefore(rawAsOf, 'day') ? effectivePreClose : rawAsOf;
  const isRd = item.accountType === 'rd';
  const cumulativeInterest = isRd ? true : (item.cumulativeInterest ?? false);
  const principal = Number.isFinite(item.principal) ? Math.max(0, item.principal) : 0;
  const rate = Number.isFinite(item.interestRate) ? Math.max(0, item.interestRate) : 0;

  const full = calculateDepositValues({
    accountType: item.accountType,
    principal: item.principal,
    recurringAmount: item.recurringAmount,
    interestRate: item.interestRate,
    startDate: item.startDate,
    maturityDate: item.maturityDate,
    cumulativeInterest,
    compoundingFrequency: item.compoundingFrequency,
    payoutFrequency: item.payoutFrequency,
    interestCreditAnchor: item.interestCreditAnchor,
    interestPayoutAmount: item.interestPayoutAmount,
  });

  // Invested to date (for reporting/principal-to-date context)
  let investedToDate = 0;
  if (isRd) {
    const recurring = Number.isFinite(item.recurringAmount) ? Math.max(0, item.recurringAmount as number) : 0;
    const totalMonths = start.isValid() && maturity.isValid() ? Math.max(0, maturity.diff(start, 'month')) : 0;
    const capped = clampAsOfToTenure(item.startDate, item.maturityDate, asOfDay.toDate());
    const monthsElapsed = capped && !asOfDay.isBefore(start, 'day') ? Math.max(0, Math.min(totalMonths, capped.diff(start, 'month'))) : 0;
    investedToDate = recurring * monthsElapsed;
  } else {
    investedToDate = start.isValid() && !asOfDay.isBefore(start, 'day') ? principal : 0;
  }

  // currentValue remains accrued-to-date snapshot semantic (Option B, recomputed)
  const currentValue = calculateDepositAccruedValueAsOf(
    {
      accountType: item.accountType,
      principal: item.principal,
      recurringAmount: item.recurringAmount,
      interestRate: item.interestRate,
      startDate: item.startDate,
      maturityDate: item.maturityDate,
      cumulativeInterest,
      compoundingFrequency: item.compoundingFrequency,
      payoutFrequency: item.payoutFrequency,
      preClosedDate: item.preClosedDate,
      preClosureCreditedValue: item.preClosureCreditedValue,
      markedAsLien: item.markedAsLien,
    },
    asOfDay.toDate(),
  );

  // Method A: totalExpectedReturns (full-tenure interest), realizedGain (cash paid out to date), unrealizedGain = remainder
  let totalExpectedReturns = Math.max(0, full.interest);
  let realizedGain = 0;

  const validTerm = start.isValid() && maturity.isValid() && maturity.isAfter(start, 'day');
  if (validTerm) {
    if (cumulativeInterest) {
      // Canonical full-tenure expected interest from shared computation.
      totalExpectedReturns = Math.max(0, full.interest);
      // Cumulative: interest locked/reinvested until maturity (cash paid out at settlement).
      if (asOfDay.isBefore(start, 'day')) {
        realizedGain = 0;
      } else if (!asOfDay.isBefore(maturity, 'day')) {
        realizedGain = totalExpectedReturns;
      } else {
        realizedGain = 0;
      }
    } else {
      // Non-cumulative: realized = completed payouts (payout date passed) based on canonical payout schedule.
      const slots = buildPayoutSchedule(item.startDate, item.maturityDate, item.payoutFrequency, item.accountType, item.interestCreditAnchor);
      const periodic = periodicPayoutAmount(item);
      if (slots.length > 0 && (periodic > 0 || (principal > 0 && rate > 0))) {
        const amounts = slots.map((s) => slotPayoutAmount(s, periodic, principal, rate));
        // Keep expected total consistent with canonical full-tenure calculation.
        totalExpectedReturns = Math.max(0, full.interest);
        realizedGain = Math.max(0, amounts.reduce((sum, a, idx) => (slots[idx]!.date.isAfter(asOfDay, 'day') ? sum : sum + a), 0));
      } else {
        totalExpectedReturns = Math.max(0, full.interest);
        realizedGain = 0;
      }
      // At/after maturity all payouts (including any maturity-date stub) are complete.
      if (!asOfDay.isBefore(maturity, 'day')) realizedGain = totalExpectedReturns;
      if (asOfDay.isBefore(start, 'day')) realizedGain = 0;
    }
  } else {
    totalExpectedReturns = 0;
    realizedGain = 0;
  }

  // Method A invariant: unrealizedGain = remaining unpaid return (realized payouts are as of the effective date,
  // which is preClosedDate for pre-closed deposits not in lien, i.e. only payouts actually made before closure count).
  let unrealizedGain = Math.max(0, totalExpectedReturns - realizedGain);
  if (Math.abs(realizedGain + unrealizedGain - totalExpectedReturns) > 0.005) {
    // clamp within floating-point rounding tolerance
    unrealizedGain = Math.max(0, totalExpectedReturns - realizedGain);
  }

  const totalReturns = (isRd ? full.totalDeposited : principal) + totalExpectedReturns;

  return {
    investedToDate,
    currentValue,
    realizedGain,
    unrealizedGain,
    totalInterest: totalExpectedReturns,
    totalReturns,
  };
}

export function summarizeDeposits(
  deposits: DepositHolding[],
  asOf: Date = new Date(),
): DepositSummary {
  // Matured & pre-closed deposits are reference-only; exclude from portfolio/principal calculations.
  const portfolio = deposits.filter((item) => isPortfolioDeposit(item, asOf));

  let totalCurrentValue = 0;
  let totalPrincipal = 0;
  let realizedGain = 0;
  let unrealizedGain = 0;

  for (const item of portfolio) {
    const derived = getDepositDerivedValues(item, asOf);
    totalCurrentValue += derived.currentValue;
    totalPrincipal += derived.investedToDate;
    realizedGain += derived.realizedGain;
    unrealizedGain += derived.unrealizedGain;
  }

  const maturingSoon = portfolio.filter((item) => {
    if (getDepositLifecycleStatus(item, asOf) !== 'active') return false;
    const days = daysUntil(item.maturityDate, asOf);
    return Number.isFinite(days) && days >= 0 && days <= 90;
  }).length;

  return {
    totalCurrentValue,
    totalPrincipal,
    realizedGain,
    unrealizedGain,
    gainPercentage: calculateReturnsPercentage(totalPrincipal, totalCurrentValue),
    maturingSoon,
    count: portfolio.length,
  };
}
