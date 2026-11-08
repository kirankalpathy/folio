import type {
  CardNetwork,
  DepositHolding,
  FinancialInstitution,
  FinancialInstitutionCategory,
  FinancialInstitutionInput,
  InvestmentSegment,
  OperationMode,
} from '../types';
import { translate } from '../i18n';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';

function clean(value: string | undefined | null): string | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  return v ? v : undefined;
}

function cleanDigits(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '');
}

function formatCardNumber(value: string | undefined | null): string | undefined {
  const digits = cleanDigits(value).slice(0, 16);
  if (!digits) return undefined;
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

function normalizeCategory(raw: unknown): FinancialInstitutionCategory {
  if (raw === 'demat-account') return 'investment-brokerage';
  if (
    raw === 'savings-account' ||
    raw === 'current-account' ||
    raw === 'credit-card-issuer' ||
    raw === 'digital-wallet' ||
    raw === 'investment-brokerage'
  ) {
    return raw;
  }
  return 'savings-account';
}

function normalizeSegments(raw: unknown): InvestmentSegment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed: InvestmentSegment[] = ['cash-equity-mf', 'equity-fo', 'commodities', 'debt'];
  const out = raw.filter((v): v is InvestmentSegment => allowed.includes(v as InvestmentSegment));
  return out.length > 0 ? Array.from(new Set(out)) : undefined;
}

function normalizeMode(raw: unknown): OperationMode | undefined {
  return raw === 'online' || raw === 'offline' ? raw : undefined;
}

function normalizeLegacy(input: Record<string, unknown>): FinancialInstitutionInput {
  const category = normalizeCategory(input.category);
  const accountNumber = clean(input.accountNumber as string | undefined);
  const ifscCode = clean(input.ifscCode as string | undefined);
  return {
    name: String(input.name ?? '').trim(),
    nickname: clean(input.nickname as string | undefined),
    category,
    operationMode: normalizeMode(input.operationMode) ?? 'online',
    accountNumber,
    ifscCode,
    cifNumber: clean(input.cifNumber as string | undefined),
    branchName: clean(input.branchName as string | undefined),
    swiftCode: clean(input.swiftCode as string | undefined),
    cardNumber: formatCardNumber(input.cardNumber as string | undefined),
    cardNetwork: (input.cardNetwork as CardNetwork | undefined) || undefined,
    creditLimit: typeof input.creditLimit === 'number' && Number.isFinite(input.creditLimit) ? input.creditLimit : undefined,
    billingCycleDay: typeof input.billingCycleDay === 'number' && Number.isFinite(input.billingCycleDay) ? Math.min(31, Math.max(1, Math.round(input.billingCycleDay))) : undefined,
    dematAccountNumber: clean(input.dematAccountNumber as string | undefined) ?? (category === 'investment-brokerage' ? accountNumber : undefined),
    uniqueClientCode: clean(input.uniqueClientCode as string | undefined),
    dpId: clean(input.dpId as string | undefined),
    segments: normalizeSegments(input.segments),
    walletId: clean(input.walletId as string | undefined),
    linkedMobile: clean(input.linkedMobile as string | undefined),
    upiId: clean(input.upiId as string | undefined),
    contactPerson: clean(input.contactPerson as string | undefined),
    contactEmail: clean(input.contactEmail as string | undefined) ?? clean(input.emailAddress as string | undefined),
    contactPhone: clean(input.contactPhone as string | undefined) ?? clean(input.phoneNumber as string | undefined),
    address:
      clean(input.address as string | undefined) ??
      ([clean(input.addressLine1 as string | undefined), clean(input.addressLine2 as string | undefined), clean(input.city as string | undefined), clean(input.state as string | undefined), clean(input.pinCode as string | undefined)]
        .filter(Boolean)
        .join(', ') || undefined),
    notes: clean(input.notes as string | undefined),
  };
}

function normalize(input: FinancialInstitutionInput | Record<string, unknown>): FinancialInstitutionInput {
  return normalizeLegacy(input as Record<string, unknown>);
}

const UPI_ID_REGEX = /^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/;

function validate(input: FinancialInstitutionInput): void {
  if (!input.name || input.name.trim().length < 2) throw new Error(translate('institutions.validation.nameRequired'));
  if (!input.category) throw new Error(translate('institutions.validation.categoryRequired'));
  if (input.category !== 'digital-wallet' && !input.operationMode) {
    throw new Error(translate('institutions.validation.operationModeRequired'));
  }

  if (input.category === 'savings-account' || input.category === 'current-account') {
    if (!input.accountNumber?.trim()) throw new Error(translate('institutions.validation.accountRequired'));
    if (!input.ifscCode?.trim()) throw new Error(translate('institutions.validation.ifscRequired'));
  }

  if (input.category === 'credit-card-issuer') {
    const digits = cleanDigits(input.cardNumber);
    if (digits.length !== 16) throw new Error(translate('institutions.validation.cardNumberRequired'));
    if (!input.cardNetwork) throw new Error(translate('institutions.validation.cardNetworkRequired'));
  }

  if (input.category === 'investment-brokerage') {
    if (!input.dematAccountNumber?.trim()) throw new Error(translate('institutions.validation.dematRequired'));
    if (!input.uniqueClientCode?.trim()) throw new Error(translate('institutions.validation.uccRequired'));
    if (!input.dpId?.trim()) throw new Error(translate('institutions.validation.dpIdRequired'));
    if (!input.segments || input.segments.length === 0) throw new Error(translate('institutions.validation.segmentsRequired'));
  }

  if (input.category === 'digital-wallet') {
    if (!input.linkedMobile?.trim()) throw new Error(translate('institutions.validation.linkedMobileRequired'));
  }

  if (input.upiId?.trim() && !UPI_ID_REGEX.test(input.upiId.trim())) {
    throw new Error(translate('institutions.validation.upiIdInvalid'));
  }
}

function migrateRecord(raw: FinancialInstitution): FinancialInstitution {
  const normalized = normalize(raw as unknown as Record<string, unknown>);
  return {
    ...raw,
    ...normalized,
    category: normalizeCategory(raw.category),
    notes: (raw as FinancialInstitution & { notes?: string }).notes,
  } as FinancialInstitution;
}

export async function listFinancialInstitutions(): Promise<FinancialInstitution[]> {
  const rows = await allRecords<FinancialInstitution>('financialInstitutions');
  return rows.map(migrateRecord).sort((a, b) => institutionLabel(a).localeCompare(institutionLabel(b)));
}

export async function getFinancialInstitution(id: string): Promise<FinancialInstitution | null> {
  const row = await getRecord<FinancialInstitution>('financialInstitutions', id);
  return row ? migrateRecord(row) : null;
}

export async function createFinancialInstitution(input: FinancialInstitutionInput): Promise<FinancialInstitution> {
  const normalized = normalize(input);
  validate(normalized);
  const now = new Date().toISOString();
  const record: FinancialInstitution = { ...(normalized as FinancialInstitution), id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await putRecord('financialInstitutions', record.id, record, { updatedAt: record.updatedAt });
  return record;
}

export async function updateFinancialInstitution(id: string, input: FinancialInstitutionInput): Promise<FinancialInstitution> {
  const existing = await getRecord<FinancialInstitution>('financialInstitutions', id);
  if (!existing) throw new Error(translate('institutions.saveError'));
  const normalized = normalize(input);
  validate(normalized);
  const updated: FinancialInstitution = { ...migrateRecord(existing), ...normalized, id, updatedAt: new Date().toISOString() } as FinancialInstitution;
  await putRecord('financialInstitutions', updated.id, updated, { updatedAt: updated.updatedAt });
  return updated;
}

export async function isFinancialInstitutionLinked(id: string): Promise<boolean> {
  const deposits = await allRecords<DepositHolding>('deposits');
  return deposits.some((d) => d.financialInstitutionId === id);
}

export async function deleteFinancialInstitution(id: string): Promise<void> {
  if (await isFinancialInstitutionLinked(id)) throw new Error(translate('institutions.deleteLinkedError'));
  await deleteRecord('financialInstitutions', id);
}

export function institutionLabel(fi: Pick<FinancialInstitution, 'name' | 'nickname' | 'category' | 'accountNumber' | 'cardNumber' | 'dematAccountNumber' | 'walletId' | 'linkedMobile' | 'upiId'>): string {
  const base = fi.nickname?.trim() || fi.name;
  const detail = fi.accountNumber || fi.cardNumber || fi.dematAccountNumber || fi.linkedMobile || fi.walletId || fi.upiId;
  if (!detail) return base;
  const tail = fi.cardNumber ? fi.cardNumber.slice(-9) : detail.length > 4 ? detail.slice(-4) : detail;
  return `${base} · ${tail}`;
}
