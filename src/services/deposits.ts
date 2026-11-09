import type { DepositHolding, DepositInput, DepositNominee } from '../types';
import { translate } from '../i18n';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';
import { getAuditActorEmail } from './currentUser';

function normalizeNominees(nominees: DepositNominee[] | undefined): DepositNominee[] | undefined {
  if (!nominees?.length) return undefined;
  const cleaned = nominees
    .map((n) => ({
      name: n.name?.trim() ?? '',
      relationship: n.relationship || 'other',
      dateOfBirth: n.dateOfBirth || undefined,
      share: Number.isFinite(n.share) ? Math.max(0, n.share) : 0,
    }))
    .filter((n) => n.name.length > 0);
  return cleaned.length ? cleaned : undefined;
}

function normalize(input: DepositInput): DepositInput {
  const isRd = input.accountType === 'rd';
  const financialInstitutionId = input.financialInstitutionId?.trim() || undefined;
  const markedAsLien = isRd ? false : Boolean(input.markedAsLien);
  const cumulativeInterest = isRd ? true : input.cumulativeInterest;
  const payoutFrequency = (isRd || cumulativeInterest) ? undefined : input.payoutFrequency;
  const interestPayoutAmount =
    !isRd && !cumulativeInterest && payoutFrequency && Number.isFinite(input.interestPayoutAmount)
      ? Math.max(0, input.interestPayoutAmount as number)
      : undefined;
  return {
    ...input,
    depositNumber: input.depositNumber?.trim() || undefined,
    name: input.name.trim(),
    bankName: input.bankName.trim(),
    accountNumber: input.accountNumber?.trim() || undefined,
    financialInstitutionId,
    recurringAmount: isRd && Number.isFinite(input.recurringAmount) ? Math.max(0, input.recurringAmount as number) : undefined,
    cumulativeInterest,
    payoutFrequency,
    interestPayoutAmount,
    operationMode: input.operationMode === 'offline' ? 'offline' : 'online',
    markedAsLien,
    lienReason: markedAsLien ? (input.lienReason?.trim() || undefined) : undefined,
    notes: input.notes?.trim() || undefined,
    nominees: normalizeNominees(input.nominees),
  };
}

function validate(input: DepositInput): void {
  if (!input.depositNumber || input.depositNumber.length < 1) throw new Error(translate('errors.deposit.depositNumber'));
  if (input.name.length < 2) throw new Error(translate('errors.deposit.name'));
  if (!input.financialInstitutionId) throw new Error(translate('deposit.validation.institutionRequired'));
  if (input.bankName.length < 2) throw new Error(translate('errors.deposit.bank'));
  if (!input.accountType) throw new Error(translate('errors.deposit.accountType'));
  if (input.accountType === 'rd') {
    if (!Number.isFinite(input.recurringAmount) || (input.recurringAmount ?? 0) <= 0) {
      throw new Error(translate('errors.deposit.recurringAmount'));
    }
  } else if (!Number.isFinite(input.principal) || input.principal < 0) {
    throw new Error(translate('errors.deposit.principal'));
  }
  if (!Number.isFinite(input.currentValue) || input.currentValue < 0) throw new Error(translate('errors.deposit.currentValue'));
  if (!Number.isFinite(input.interestRate) || input.interestRate < 0) throw new Error(translate('errors.deposit.rate'));
  if (!input.startDate || !input.maturityDate) throw new Error(translate('errors.deposit.dates'));
  if (input.maturityDate < input.startDate) throw new Error(translate('errors.deposit.dateOrder'));
  if (!input.rollover) throw new Error(translate('errors.deposit.rollover'));
  if (input.accountType !== 'rd' && input.cumulativeInterest === false && !input.payoutFrequency) {
    throw new Error(translate('errors.deposit.payoutFrequency'));
  }
  if (input.markedAsLien && !input.lienReason?.trim()) {
    throw new Error(translate('deposit.validation.lienReasonRequired'));
  }
  const nominees = input.nominees ?? [];
  if (nominees.some((n) => !n.name?.trim())) {
    throw new Error(translate('deposit.validation.nomineeNameRequired'));
  }
  const nomineeKeys = nominees.map((n) => n.name.trim().toLowerCase());
  if (new Set(nomineeKeys).size !== nomineeKeys.length) {
    throw new Error(translate('deposit.validation.nomineeUnique'));
  }
  if (nominees.some((n) => !Number.isFinite(n.share) || n.share < 0 || n.share > 100)) {
    throw new Error(translate('deposit.validation.nomineeShareMax'));
  }
  if (nominees.length > 0) {
    const totalShare = nominees.reduce((s, n) => s + n.share, 0);
    if (Math.abs(totalShare - 100) > 0.001) {
      throw new Error(translate('deposit.validation.nomineeShareTotal'));
    }
  }
}

export async function listDeposits(): Promise<DepositHolding[]> {
  return allRecords<DepositHolding>('deposits', 'maturityDate');
}

export async function getDeposit(id: string): Promise<DepositHolding | null> {
  return getRecord<DepositHolding>('deposits', id);
}

export async function createDeposit(input: DepositInput): Promise<DepositHolding> {
  const normalized = normalize(input);
  validate(normalized);
  const now = new Date().toISOString();
  const actorId = await getAuditActorEmail();
  const record: DepositHolding = {
    ...normalized,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    changedAt: now,
    createdBy: actorId,
    changedBy: actorId,
  };
  await putRecord('deposits', record.id, record, { maturityDate: record.maturityDate, updatedAt: record.updatedAt });
  return record;
}

export async function updateDeposit(id: string, input: DepositInput): Promise<DepositHolding> {
  const existing = await getRecord<DepositHolding>('deposits', id);
  if (!existing) throw new Error(translate('errors.deposit.missing'));
  const normalized = normalize(input);
  validate(normalized);
  const now = new Date().toISOString();
  const actorId = await getAuditActorEmail();
  const updated: DepositHolding = {
    ...existing,
    ...normalized,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
    updatedAt: now,
    changedAt: now,
    changedBy: actorId,
  };
  await putRecord('deposits', updated.id, updated, { maturityDate: updated.maturityDate, updatedAt: updated.updatedAt });
  return updated;
}

export async function deleteDeposit(id: string): Promise<void> {
  await deleteRecord('deposits', id);
}
