import type { CSSProperties } from 'react';
import type { CompoundingFrequency, DepositHolding, DepositPayoutFrequency, DepositType } from '../../types';
import type { MessageKey, Translator } from '../../i18n';

const ACCOUNT_LABEL_KEYS: Record<string, MessageKey> = {
  fd: 'deposit.accountShort.fd',
  rd: 'deposit.accountShort.rd',
  'tax-saving': 'deposit.accountShort.taxSaving',
  savings: 'deposit.accountShort.savings',
  nsc: 'deposit.accountShort.nsc',
  other: 'deposit.accountShort.other',
};

const FREQUENCY_LABEL_KEYS: Record<CompoundingFrequency | DepositPayoutFrequency, MessageKey> = {
  annual: 'deposit.frequency.annual',
  'semi-annual': 'deposit.frequency.semiAnnual',
  quarterly: 'deposit.frequency.quarterly',
  monthly: 'deposit.frequency.monthly',
};

export function accountLabel(
  accountType: DepositHolding['accountType'],
  t: Translator,
): string {
  const key = ACCOUNT_LABEL_KEYS[accountType] ?? 'deposit.accountShort.other';
  return t(key);
}

export const ACCOUNT_TYPE_FILTER_OPTIONS: Array<{ value: DepositType; labelKey: MessageKey }> = [
  { value: 'fd', labelKey: 'deposit.account.fd' },
  { value: 'rd', labelKey: 'deposit.account.rd' },
  { value: 'tax-saving', labelKey: 'deposit.account.taxSaving' },
  { value: 'savings', labelKey: 'deposit.account.savings' },
  { value: 'nsc', labelKey: 'deposit.account.nsc' },
  { value: 'other', labelKey: 'deposit.account.other' },
];

export function accountTypeTagStyle(type: DepositType): CSSProperties {
  const map: Record<DepositType, { bg: string; border: string; text: string }> = {
    fd: { bg: 'var(--folio-success-bg)', border: 'var(--folio-success-border)', text: 'var(--folio-success-text)' },
    rd: { bg: 'var(--folio-info-bg)', border: 'var(--folio-info-border)', text: 'var(--folio-info-text)' },
    'tax-saving': { bg: 'var(--folio-warning-bg)', border: 'var(--folio-warning-border)', text: 'var(--folio-warning-text)' },
    savings: { bg: 'color-mix(in srgb, #14b8a6 16%, transparent)', border: 'color-mix(in srgb, #14b8a6 40%, transparent)', text: '#0f766e' },
    nsc: { bg: 'color-mix(in srgb, #8b5cf6 16%, transparent)', border: 'color-mix(in srgb, #8b5cf6 40%, transparent)', text: '#6d28d9' },
    other: { bg: 'color-mix(in srgb, #64748b 14%, transparent)', border: 'color-mix(in srgb, #64748b 35%, transparent)', text: '#475569' },
  };
  const c = map[type] ?? map.other;
  return { background: c.bg, border: `1px solid ${c.border}`, color: c.text };
}

export function frequencyLabel(
  frequency: CompoundingFrequency | DepositPayoutFrequency | undefined,
  t: Translator,
): string {
  if (!frequency) return '—';
  return t(FREQUENCY_LABEL_KEYS[frequency]);
}

export function compoundingLabel(
  frequency: CompoundingFrequency | undefined,
  t: Translator,
): string {
  return frequencyLabel(frequency, t);
}

export function maturityClass(days: number): string {
  if (days < 0) return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400';
  if (days <= 90) return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
}

export function maturityLabel(days: number, t: Translator): string {
  if (!Number.isFinite(days)) return '—';
  if (days < 0) return t('common.daysPast', { days: Math.abs(days) });
  if (days === 0) return t('common.today');
  return t('common.daysLeft', { days });
}
