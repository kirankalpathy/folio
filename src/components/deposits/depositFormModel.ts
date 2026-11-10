import dayjs, { type Dayjs } from 'dayjs';
import type { MessageKey } from '../../i18n';
import type {
  CompoundingFrequency,
  DepositHolding,
  DepositInput,
  DepositJointHolder,
  DepositNominee,
  DepositOperationType,
  DepositPayoutFrequency,
  DepositRollover,
  DepositType,
  NomineeRelationship,
  OperationMode,
} from '../../types';

export const InterestPayoutOption = {
  Cumulative: 'cumulative',
  Monthly: 'monthly',
  Quarterly: 'quarterly',
  SemiAnnual: 'semi-annual',
  Annual: 'annual',
} as const;

export type InterestPayoutOption = (typeof InterestPayoutOption)[keyof typeof InterestPayoutOption];

export function isCumulativePayoutOption(option: InterestPayoutOption | undefined): boolean {
  return option === InterestPayoutOption.Cumulative || option == null;
}

export function deriveCumulativeInterest(accountType: DepositType | undefined, option: InterestPayoutOption | undefined): boolean {
  return accountType === 'rd' || isCumulativePayoutOption(option);
}

export function derivePeriodicPayoutFrequency(accountType: DepositType | undefined, option: InterestPayoutOption | undefined): DepositPayoutFrequency | undefined {
  if (accountType === 'rd' || !option || option === InterestPayoutOption.Cumulative) return undefined;
  return option as DepositPayoutFrequency;
}

export function toInterestPayoutOption(deposit: Pick<DepositHolding, 'accountType' | 'cumulativeInterest' | 'payoutFrequency'>): InterestPayoutOption {
  if (deposit.accountType === 'rd') return InterestPayoutOption.Cumulative;
  if (deposit.cumulativeInterest === false && deposit.payoutFrequency) return deposit.payoutFrequency as InterestPayoutOption;
  if (deposit.cumulativeInterest === true) return InterestPayoutOption.Cumulative;
  // Legacy ambiguous: if a periodic payout frequency exists, treat as non-cumulative payout; else cumulative.
  if (deposit.payoutFrequency) return deposit.payoutFrequency as InterestPayoutOption;
  return InterestPayoutOption.Cumulative;
}

export interface DepositNomineeFormValue {
  name: string;
  relationship: NomineeRelationship | string;
  dateOfBirth?: Dayjs;
  /** Percentage share; undefined means not yet entered (placeholder shown). */
  share?: number;
}

export interface DepositJointHolderFormValue {
  name: string;
  dateOfBirth?: Dayjs;
  share?: number;
}

export interface DepositFormValues {
  depositNumber: string;
  name: string;
  financialInstitutionId?: string;
  bankName: string;
  accountType: DepositType;
  operationType: DepositOperationType;
  jointHolders: DepositJointHolderFormValue[];
  principal: number;
  recurringAmount?: number;
  interestRate: number;
  compoundingFrequency: CompoundingFrequency;
  /** @deprecated derived from interestPayoutOption; kept for compatibility with existing form consumers. */
  cumulativeInterest: boolean;
  /** @deprecated periodic payout only when non-cumulative; derived from interestPayoutOption. */
  payoutFrequency: DepositPayoutFrequency;
  /** UI selection: cumulative (compounded) or a periodic interest payout frequency. */
  interestPayoutOption: InterestPayoutOption;
  rollover: DepositRollover;
  operationMode: OperationMode;
  isPanLinked: boolean;
  isTaxExempt: boolean;
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
  // TODO: implement incrementally
  // { value: 'tax-saving', label: 'deposit.account.taxSaving' },
  // { value: 'other', label: 'deposit.account.other' },
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
export const INTEREST_PAYOUT_OPTIONS: Array<{ value: InterestPayoutOption; label: MessageKey }> = [
  { value: InterestPayoutOption.Cumulative, label: 'deposit.payoutMode.cumulative' },
  { value: InterestPayoutOption.Monthly, label: 'deposit.frequency.monthly' },
  { value: InterestPayoutOption.Quarterly, label: 'deposit.frequency.quarterly' },
  { value: InterestPayoutOption.SemiAnnual, label: 'deposit.frequency.semiAnnual' },
  { value: InterestPayoutOption.Annual, label: 'deposit.frequency.annual' },
];

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

export const OPERATION_TYPE_OPTIONS: Array<{ value: DepositOperationType; label: MessageKey }> = [
  { value: 'single', label: 'deposit.operationType.single' },
  { value: 'joint', label: 'deposit.operationType.joint' },
  { value: 'either-or-survivor', label: 'deposit.operationType.eitherOrSurvivor' },
  { value: 'former-or-survivor', label: 'deposit.operationType.formerOrSurvivor' },
];

export const newNominee = (): DepositNomineeFormValue => ({
  name: '',
  relationship: 'spouse',
  share: undefined,
});

export const newJointHolder = (): DepositJointHolderFormValue => ({
  name: '',
  share: undefined,
});

function jointHolderKey(h: Pick<DepositJointHolder, 'name'>): string {
  return h.name.trim().toLowerCase();
}

export function buildJointHolderSuggestions(deposits: DepositHolding[], excludeId?: string): DepositJointHolder[] {
  const byKey = new Map<string, DepositJointHolder>();
  for (const d of deposits) {
    if (excludeId && d.id === excludeId) continue;
    for (const h of d.jointHolders ?? []) {
      const key = jointHolderKey(h);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, { name: h.name, dateOfBirth: h.dateOfBirth, share: h.share });
    }
  }
  return Array.from(byKey.values());
}

export function defaultDepositValues(): DepositFormValues {
  const start = dayjs().startOf('day');
  return {
    depositNumber: '',
    name: '',
    financialInstitutionId: undefined,
    bankName: '',
    accountType: 'fd',
    operationType: 'single',
    jointHolders: [],
    principal: 0,
    recurringAmount: undefined,
    interestRate: 0,
    compoundingFrequency: 'quarterly',
    cumulativeInterest: true,
    payoutFrequency: 'annual',
    interestPayoutOption: InterestPayoutOption.Cumulative,
    rollover: 'none',
    operationMode: 'online',
    isPanLinked: true,
    isTaxExempt: false,
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
  const isRd = deposit.accountType === 'rd';
  const interestPayoutOption = toInterestPayoutOption(deposit);
  const cumulativeInterest = deriveCumulativeInterest(deposit.accountType, interestPayoutOption);
  const payoutFrequency = derivePeriodicPayoutFrequency(deposit.accountType, interestPayoutOption) ?? deposit.payoutFrequency ?? 'annual';
  return {
    depositNumber: deposit.depositNumber ?? '',
    name: deposit.name,
    financialInstitutionId: deposit.financialInstitutionId,
    bankName: deposit.bankName,
    accountType: deposit.accountType,
    operationType: deposit.operationType ?? 'single',
    jointHolders: (deposit.jointHolders ?? []).map((h) => ({
      name: h.name ?? '',
      dateOfBirth: h.dateOfBirth ? dayjs(h.dateOfBirth) : undefined,
      share: Number.isFinite(h.share) ? h.share : undefined,
    })),
    principal: deposit.principal,
    recurringAmount: deposit.recurringAmount,
    interestRate: deposit.interestRate,
    compoundingFrequency: deposit.compoundingFrequency ?? 'quarterly',
    cumulativeInterest,
    payoutFrequency,
    interestPayoutOption,
    rollover: deposit.rollover ?? 'none',
    operationMode: deposit.operationMode ?? 'online',
    isPanLinked: deposit.isPanLinked ?? true,
    isTaxExempt: deposit.isTaxExempt ?? false,
    markedAsLien: isRd ? false : Boolean(deposit.markedAsLien),
    lienReason: isRd ? '' : (deposit.lienReason ?? ''),
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
      share: Number.isFinite(n.share) ? n.share : undefined,
    })),
  };
}

function toNomineeInput(n: DepositNomineeFormValue): DepositNominee | null {
  const name = n?.name?.trim();
  if (!name) return null;
  const share = typeof n.share === 'number' && Number.isFinite(n.share) ? n.share : 0;
  return {
    name,
    relationship: n.relationship || 'other',
    dateOfBirth: n.dateOfBirth ? n.dateOfBirth.format('YYYY-MM-DD') : undefined,
    share: Math.max(0, share),
  };
}

function toJointHolderInput(h: DepositJointHolderFormValue): DepositJointHolder | null {
  const name = h?.name?.trim();
  const share = typeof h?.share === 'number' ? h.share : Number(h?.share);
  if (!name || !h.dateOfBirth || !Number.isFinite(share)) return null;
  return {
    name,
    dateOfBirth: h.dateOfBirth.format('YYYY-MM-DD'),
    share: Math.max(0, Math.min(100, share)),
  };
}

export function toDepositInput(
  values: DepositFormValues,
  computed: { realizedValue: number; totalDeposited: number; interestPayoutAmount?: number },
): DepositInput {
  const isRd = values.accountType === 'rd';
  const nominees = (values.nominees ?? []).map(toNomineeInput).filter((n): n is DepositNominee => Boolean(n));
  const operationType = values.operationType ?? 'single';
  const jointHolders = operationType === 'single'
    ? []
    : (values.jointHolders ?? []).map(toJointHolderInput).filter((h): h is DepositJointHolder => Boolean(h));
  const markedAsLien = isRd ? false : Boolean(values.markedAsLien);
  const cumulativeInterest = deriveCumulativeInterest(values.accountType, values.interestPayoutOption);
  const periodicPayoutFrequency = derivePeriodicPayoutFrequency(values.accountType, values.interestPayoutOption);
  const recurringAmount = isRd && Number.isFinite(values.recurringAmount) ? Math.max(0, values.recurringAmount as number) : undefined;
  const principal = isRd ? computed.totalDeposited : values.principal;
  const interestPayoutAmount = (!isRd && !cumulativeInterest && Number.isFinite(computed.interestPayoutAmount))
    ? computed.interestPayoutAmount
    : undefined;
  return {
    depositNumber: values.depositNumber.trim().toUpperCase().replace(/[^A-Z0-9_/-]/g, ''),
    name: values.name.trim(),
    bankName: values.bankName.trim(),
    financialInstitutionId: values.financialInstitutionId || undefined,
    accountType: values.accountType,
    operationType,
    jointHolders: jointHolders.length ? jointHolders : undefined,
    principal,
    recurringAmount,
    currentValue: computed.realizedValue,
    interestRate: values.interestRate,
    compoundingFrequency: values.compoundingFrequency,
    cumulativeInterest,
    payoutFrequency: periodicPayoutFrequency,
    interestPayoutAmount,
    rollover: values.rollover,
    operationMode: values.operationMode ?? 'online',
    isPanLinked: Boolean(values.isPanLinked),
    isTaxExempt: Boolean(values.isTaxExempt),
    markedAsLien,
    lienReason: markedAsLien ? (values.lienReason?.trim() || undefined) : undefined,
    preClosedDate: values.preClosed ? (values.preClosedDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD')) : undefined,
    preClosureCreditedValue: values.preClosed && Number.isFinite(values.preClosureCreditedValue) ? values.preClosureCreditedValue : undefined,
    startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : '',
    maturityDate: values.maturityDate ? values.maturityDate.format('YYYY-MM-DD') : '',
    notes: values.notes?.trim() || undefined,
    nominees: nominees.length ? nominees : undefined,
  };
}
