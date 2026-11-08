import type { DepositHolding, DepositInput, DepositNominee } from '../types';
import { translate } from '../i18n';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';

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
  const financialInstitutionId = input.financialInstitutionId?.trim() || undefined;
  return {
    ...input,
    depositNumber: input.depositNumber?.trim() || undefined,
    name: input.name.trim(),
    bankName: input.bankName.trim(),
    accountNumber: input.accountNumber?.trim() || undefined,
    financialInstitutionId,
    operationMode: input.operationMode === 'offline' ? 'offline' : 'online',
    markedAsLien: Boolean(input.markedAsLien),
    lienReason: input.markedAsLien ? (input.lienReason?.trim() || undefined) : undefined,
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
  if (!Number.isFinite(input.principal) || input.principal < 0) throw new Error(translate('errors.deposit.principal'));
  if (!Number.isFinite(input.currentValue) || input.currentValue < 0) throw new Error(translate('errors.deposit.currentValue'));
  if (!Number.isFinite(input.interestRate) || input.interestRate < 0) throw new Error(translate('errors.deposit.rate'));
  if (!input.startDate || !input.maturityDate) throw new Error(translate('errors.deposit.dates'));
  if (input.maturityDate < input.startDate) throw new Error(translate('errors.deposit.dateOrder'));
  if (!input.rollover) throw new Error(translate('errors.deposit.rollover'));
  if (input.cumulativeInterest === false && !input.payoutFrequency) {
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
  const record: DepositHolding = { ...normalized, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await putRecord('deposits', record.id, record, { maturityDate: record.maturityDate, updatedAt: record.updatedAt });
  return record;
}

export async function updateDeposit(id: string, input: DepositInput): Promise<DepositHolding> {
  const existing = await getRecord<DepositHolding>('deposits', id);
  if (!existing) throw new Error(translate('errors.deposit.missing'));
  const normalized = normalize(input);
  validate(normalized);
  const updated: DepositHolding = { ...existing, ...normalized, updatedAt: new Date().toISOString() };
  await putRecord('deposits', updated.id, updated, { maturityDate: updated.maturityDate, updatedAt: updated.updatedAt });
  return updated;
}

export async function deleteDeposit(id: string): Promise<void> {
  await deleteRecord('deposits', id);
}
