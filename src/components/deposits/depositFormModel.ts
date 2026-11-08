import dayjs, { type Dayjs } from 'dayjs';
import type { MessageKey } from '../../i18n';
import type {
  CompoundingFrequency,
  DepositHolding,
  DepositInput,
  DepositNominee,
  DepositPayoutFrequency,
  DepositRollover,
  DepositType,
  NomineeRelationship,
  OperationMode,
} from '../../types';

export interface DepositNomineeFormValue {
  name: string;
  relationship: NomineeRelationship | string;
  dateOfBirth?: Dayjs;
  share: number;
}

export interface DepositFormValues {
  depositNumber: string;
  name: string;
  financialInstitutionId?: string;
  bankName: string;
  accountNumber?: string;
  accountType: DepositType;
  principal: number;
  interestRate: number;
  compoundingFrequency: CompoundingFrequency;
  cumulativeInterest: boolean;
  payoutFrequency: DepositPayoutFrequency;
  rollover: DepositRollover;
  operationMode: OperationMode;
  markedAsLien: boolean;
  lienReason?: string;
  preClosed: boolean;
  preClosedDate?: Dayjs;
  preClosureCreditedValue?: number;
  startDate?: Dayjs;
  maturityDate?: Dayjs;
  notes?: string;
  nominees: DepositNomineeFormValue[];
}

export const ACCOUNT_OPTIONS: Array<{ value: DepositType; label: MessageKey }> = [
  { value: 'fd', label: 'deposit.account.fd' },
  { value: 'rd', label: 'deposit.account.rd' },
  { value: 'tax-saving', label: 'deposit.account.taxSaving' },
  { value: 'other', label: 'deposit.account.other' },
];

export const FREQUENCY_OPTIONS: Array<{
  value: CompoundingFrequency & DepositPayoutFrequency;
  label: MessageKey;
  months: number;
}> = [
  { value: 'annual', label: 'deposit.frequency.annual', months: 12 },
  { value: 'semi-annual', label: 'deposit.frequency.semiAnnual', months: 6 },
  { value: 'quarterly', label: 'deposit.frequency.quarterly', months: 3 },
  { value: 'monthly', label: 'deposit.frequency.monthly', months: 1 },
];

export const COMPOUNDING_OPTIONS = FREQUENCY_OPTIONS.map(({ value, label }) => ({ value, label }));
export const PAYOUT_OPTIONS = FREQUENCY_OPTIONS.map(({ value, label, months }) => ({ value, label, months }));

export const ROLLOVER_OPTIONS: Array<{ value: DepositRollover; label: MessageKey }> = [
  { value: 'none', label: 'deposit.rollover.none' },
  { value: 'principal', label: 'deposit.rollover.principal' },
  { value: 'principal-interest', label: 'deposit.rollover.principalInterest' },
];

export const NOMINEE_RELATIONSHIP_OPTIONS: Array<{ value: NomineeRelationship; label: MessageKey }> = [
  { value: 'spouse', label: 'deposit.relationship.spouse' },
  { value: 'father', label: 'deposit.relationship.father' },
  { value: 'mother', label: 'deposit.relationship.mother' },
  { value: 'son', label: 'deposit.relationship.son' },
  { value: 'daughter', label: 'deposit.relationship.daughter' },
  { value: 'brother', label: 'deposit.relationship.brother' },
  { value: 'sister', label: 'deposit.relationship.sister' },
  { value: 'other', label: 'deposit.relationship.other' },
];

export function defaultDepositValues(): DepositFormValues {
  const start = dayjs().startOf('day');
  return {
    depositNumber: '',
    name: '',
    financialInstitutionId: undefined,
    bankName: '',
    accountNumber: '',
    accountType: 'fd',
    principal: 0,
    interestRate: 0,
    compoundingFrequency: 'quarterly',
    cumulativeInterest: false,
    payoutFrequency: 'annual',
    rollover: 'none',
    operationMode: 'online',
    markedAsLien: false,
    lienReason: '',
    preClosed: false,
    preClosedDate: undefined,
    preClosureCreditedValue: undefined,
    startDate: start,
    maturityDate: start.add(1, 'year'),
    notes: '',
    nominees: [],
  };
}

export function toFormValues(deposit: DepositHolding): DepositFormValues {
  return {
    depositNumber: deposit.depositNumber ?? '',
    name: deposit.name,
    financialInstitutionId: deposit.financialInstitutionId,
    bankName: deposit.bankName,
    accountNumber: deposit.accountNumber ?? '',
    accountType: deposit.accountType,
    principal: deposit.principal,
    interestRate: deposit.interestRate,
    compoundingFrequency: deposit.compoundingFrequency ?? 'quarterly',
    cumulativeInterest: deposit.cumulativeInterest ?? false,
    payoutFrequency: deposit.payoutFrequency ?? 'annual',
    rollover: deposit.rollover ?? 'none',
    operationMode: deposit.operationMode ?? 'online',
    markedAsLien: Boolean(deposit.markedAsLien),
    lienReason: deposit.lienReason ?? '',
    preClosed: Boolean(deposit.preClosedDate),
    preClosedDate: deposit.preClosedDate ? dayjs(deposit.preClosedDate) : undefined,
    preClosureCreditedValue: deposit.preClosureCreditedValue,
    startDate: deposit.startDate ? dayjs(deposit.startDate) : undefined,
    maturityDate: deposit.maturityDate ? dayjs(deposit.maturityDate) : undefined,
    notes: deposit.notes ?? '',
    nominees: (deposit.nominees ?? []).map((n) => ({
      name: n.name ?? '',
      relationship: n.relationship ?? 'other',
      dateOfBirth: n.dateOfBirth ? dayjs(n.dateOfBirth) : undefined,
      share: Number.isFinite(n.share) ? n.share : 0,
    })),
  };
}

function toNomineeInput(n: DepositNomineeFormValue): DepositNominee | null {
  const name = n?.name?.trim();
  if (!name) return null;
  return {
    name,
    relationship: n.relationship || 'other',
    dateOfBirth: n.dateOfBirth ? n.dateOfBirth.format('YYYY-MM-DD') : undefined,
    share: Number.isFinite(n.share) ? Math.max(0, n.share) : 0,
  };
}

export function toDepositInput(values: DepositFormValues, computedCurrentValue: number): DepositInput {
  const nominees = (values.nominees ?? []).map(toNomineeInput).filter((n): n is DepositNominee => Boolean(n));
  return {
    depositNumber: values.depositNumber.trim(),
    name: values.name.trim(),
    bankName: values.bankName.trim(),
    accountNumber: values.accountNumber?.trim() || undefined,
    financialInstitutionId: values.financialInstitutionId || undefined,
    accountType: values.accountType,
    principal: values.principal,
    currentValue: computedCurrentValue,
    interestRate: values.interestRate,
    compoundingFrequency: values.compoundingFrequency,
    cumulativeInterest: values.cumulativeInterest,
    payoutFrequency: values.cumulativeInterest ? undefined : values.payoutFrequency,
    rollover: values.rollover,
    operationMode: values.operationMode ?? 'online',
    markedAsLien: Boolean(values.markedAsLien),
    lienReason: values.markedAsLien ? (values.lienReason?.trim() || undefined) : undefined,
    preClosedDate: values.preClosed ? (values.preClosedDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD')) : undefined,
    preClosureCreditedValue: values.preClosed && Number.isFinite(values.preClosureCreditedValue) ? values.preClosureCreditedValue : undefined,
    startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : '',
    maturityDate: values.maturityDate ? values.maturityDate.format('YYYY-MM-DD') : '',
    notes: values.notes?.trim() || undefined,
    nominees: nominees.length ? nominees : undefined,
  };
}
