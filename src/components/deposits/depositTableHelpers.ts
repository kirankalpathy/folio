import type { CompoundingFrequency, DepositHolding, DepositPayoutFrequency } from '../../types';
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
