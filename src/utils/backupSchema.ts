import type { ApplicationBackupSchema } from '../types';
import { translate } from '../i18n';

type FieldKind = 'string' | 'number' | 'date' | 'boolean';
type FieldExtra =
  | 'optional'
  | readonly string[]
  | { optional?: boolean; enum?: readonly string[] };
type FieldRule = readonly [key: string, kind: FieldKind, extra?: FieldExtra];

const EXCHANGES = ['NSE', 'BSE', 'NASDAQ', 'NYSE', 'OTHER'] as const;
const STOCK_INSTRUMENTS = ['equity', 'etf', 'reit', 'invit'] as const;
const BOND_TYPES = ['government', 'corporate', 'tax-free', 'other'] as const;
const COUPON_FREQUENCIES = ['annual', 'semi-annual', 'quarterly', 'monthly', 'zero-coupon'] as const;
const PF_TYPES = ['EPF', 'PPF', 'VPF', 'NPS', 'OTHER'] as const;
const DEPOSIT_TYPES = ['fd', 'rd', 'tax-saving', 'savings', 'nsc', 'other'] as const;
const COMPOUNDING = ['annual', 'semi-annual', 'quarterly', 'monthly'] as const;
const PAYOUT_FREQUENCIES = COMPOUNDING;
const ROLLOVERS = ['none', 'principal', 'principal-interest'] as const;
const OPERATION_MODES = ['online', 'offline'] as const;
const DEPOSIT_OPERATION_TYPES = ['single', 'joint', 'either-or-survivor', 'former-or-survivor'] as const;
const COMMODITY_FORMS = ['physical', 'etf', 'sgb', 'digital'] as const;
const COMMODITY_UNITS = ['gram', 'kilogram', 'ounce', 'unit'] as const;
const DEBT_TYPES = [
  'home-loan',
  'personal-loan',
  'car-loan',
  'education-loan',
  'credit-card',
  'other',
] as const;

const BASE_FIELDS: FieldRule[] = [
  ['id', 'string'],
  ['createdAt', 'date'],
  ['updatedAt', 'date'],
  ['notes', 'string', 'optional'],
];

const STOCK_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['symbol', 'string'],
  ['name', 'string'],
  ['exchange', 'string', EXCHANGES],
  ['instrument', 'string', STOCK_INSTRUMENTS],
  ['sector', 'string', 'optional'],
  ['quantity', 'number'],
  ['averageCost', 'number'],
  ['currentPrice', 'number'],
  ['purchaseDate', 'date'],
];

const BOND_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['name', 'string'],
  ['issuer', 'string'],
  ['bondType', 'string', BOND_TYPES],
  ['units', 'number'],
  ['faceValue', 'number'],
  ['purchasePrice', 'number'],
  ['currentPrice', 'number'],
  ['couponRate', 'number'],
  ['couponFrequency', 'string', COUPON_FREQUENCIES],
  ['purchaseDate', 'date'],
  ['maturityDate', 'date'],
];

const PF_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['name', 'string'],
  ['accountType', 'string', PF_TYPES],
  ['institution', 'string'],
  ['accountNumberLast4', 'string', 'optional'],
  ['currentBalance', 'number'],
  ['totalContributed', 'number'],
  ['interestRate', 'number'],
  ['monthlyContribution', 'number'],
  ['openedOn', 'date'],
  ['maturityDate', 'date', 'optional'],
];

const DEPOSIT_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['depositNumber', 'string', 'optional'],
  ['name', 'string'],
  ['bankName', 'string'],
  ['accountNumber', 'string', 'optional'],
  ['financialInstitutionId', 'string', 'optional'],
  ['accountType', 'string', DEPOSIT_TYPES],
  ['principal', 'number'],
  ['recurringAmount', 'number', 'optional'],
  ['currentValue', 'number'],
  ['interestRate', 'number'],
  ['compoundingFrequency', 'string', { optional: true, enum: COMPOUNDING }],
  ['cumulativeInterest', 'boolean', 'optional'],
  ['payoutFrequency', 'string', { optional: true, enum: PAYOUT_FREQUENCIES }],
  ['rollover', 'string', { optional: true, enum: ROLLOVERS }],
  ['operationMode', 'string', { optional: true, enum: OPERATION_MODES }],
  ['operationType', 'string', { optional: true, enum: DEPOSIT_OPERATION_TYPES }],
  ['isPanLinked', 'boolean', 'optional'],
  ['isTaxExempt', 'boolean', 'optional'],
  ['markedAsLien', 'boolean', 'optional'],
  ['lienReason', 'string', 'optional'],
  ['preClosedDate', 'date', 'optional'],
  ['preClosureCreditedValue', 'number', 'optional'],
  ['startDate', 'date'],
  ['maturityDate', 'date'],
];

const COMMODITY_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['name', 'string'],
  ['form', 'string', COMMODITY_FORMS],
  ['unit', 'string', COMMODITY_UNITS],
  ['quantity', 'number'],
  ['averageCostPerUnit', 'number'],
  ['currentPricePerUnit', 'number'],
  ['purchaseDate', 'date'],
];

const DEBT_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['name', 'string'],
  ['lender', 'string'],
  ['debtType', 'string', DEBT_TYPES],
  ['originalPrincipal', 'number'],
  ['outstandingPrincipal', 'number'],
  ['interestRate', 'number'],
  ['emiAmount', 'number'],
  ['tenureMonths', 'number'],
  ['startDate', 'date'],
  ['nextDueDate', 'date', 'optional'],
];

const FI_CATEGORIES = ['savings-account', 'current-account', 'credit-card-issuer', 'digital-wallet', 'investment-brokerage', 'demat-account'] as const;
const FINANCIAL_INSTITUTION_FIELDS: FieldRule[] = [
  ...BASE_FIELDS,
  ['name', 'string'],
  ['nickname', 'string', 'optional'],
  ['accountNumber', 'string', 'optional'],
  ['category', 'string', FI_CATEGORIES],
  ['ifscCode', 'string', 'optional'],
  ['branchName', 'string', 'optional'],
  ['swiftCode', 'string', 'optional'],
  ['operationMode', 'string', { optional: true, enum: OPERATION_MODES }],
  ['cardNumber', 'string', 'optional'],
  ['cardNetwork', 'string', 'optional'],
  ['creditLimit', 'number', 'optional'],
  ['billingCycleDay', 'number', 'optional'],
  ['dematAccountNumber', 'string', 'optional'],
  ['uniqueClientCode', 'string', 'optional'],
  ['dpId', 'string', 'optional'],
  ['linkedMobile', 'string', 'optional'],
  ['upiId', 'string', 'optional'],
  ['address', 'string', 'optional'],
  ['contactPerson', 'string', 'optional'],
  ['contactEmail', 'string', 'optional'],
  ['contactPhone', 'string', 'optional'],
  ['addressLine1', 'string', 'optional'],
  ['addressLine2', 'string', 'optional'],
  ['state', 'string', 'optional'],
  ['city', 'string', 'optional'],
  ['pinCode', 'string', 'optional'],
  ['phoneNumber', 'string', 'optional'],
  ['emailAddress', 'string', 'optional'],
  ['designation', 'string', 'optional'],
];

const COLLECTIONS: ReadonlyArray<readonly [string, FieldRule[]]> = [
  ['stocks', STOCK_FIELDS],
  ['bonds', BOND_FIELDS],
  ['pfAccounts', PF_FIELDS],
  ['deposits', DEPOSIT_FIELDS],
  ['commodities', COMMODITY_FIELDS],
  ['debts', DEBT_FIELDS],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

const INVESTMENT_SEGMENTS = ['cash-equity-mf', 'equity-fo', 'commodities', 'debt'] as const;

function fieldMeta(extra: FieldExtra | undefined): { optional: boolean; enumValues?: readonly string[] } {
  if (extra === undefined) return { optional: false };
  if (extra === 'optional') return { optional: true };
  if (Array.isArray(extra)) return { optional: false, enumValues: extra };
  const obj = extra as { optional?: boolean; enum?: readonly string[] };
  return { optional: !!obj.optional, enumValues: obj.enum };
}

function validateField(record: Record<string, unknown>, rule: FieldRule): string | null {
  const [key, kind, extra] = rule;
  const value = record[key];
  const meta = fieldMeta(extra);

  if (value === undefined) return meta.optional ? null : `missing required "${key}"`;
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value) ? null : `"${key}" must be a valid number`;
  if (kind === 'boolean') return typeof value === 'boolean' ? null : `"${key}" must be true or false`;
  if (typeof value !== 'string') return `"${key}" must be text`;
  if (kind === 'date' && Number.isNaN(Date.parse(value))) return `"${key}" must be a valid date`;
  if (meta.enumValues && !meta.enumValues.includes(value)) return `"${key}" has an unsupported value "${value}"`;
  return null;
}

function validateDepositNominees(record: Record<string, unknown>): string | null {
  const nominees = record.nominees;
  if (nominees === undefined) return null;
  if (!Array.isArray(nominees)) return '"nominees" must be a list';
  for (let i = 0; i < nominees.length; i++) {
    const n = nominees[i];
    if (!isRecord(n)) return `nominees[${i + 1}] is invalid`;
    if (typeof n.name !== 'string' || n.name.trim().length === 0) return `nominees[${i + 1}] name is required`;
    if (typeof n.relationship !== 'string' || n.relationship.trim().length === 0) return `nominees[${i + 1}] relationship is required`;
    if (typeof n.share !== 'number' || !Number.isFinite(n.share) || n.share < 0) return `nominees[${i + 1}] share must be a valid number`;
    if (n.dateOfBirth !== undefined && (typeof n.dateOfBirth !== 'string' || Number.isNaN(Date.parse(n.dateOfBirth)))) {
      return `nominees[${i + 1}] date of birth must be a valid date`;
    }
  }
  return null;
}

function validateDepositJointHolders(record: Record<string, unknown>): string | null {
  const holders = record.jointHolders;
  if (holders === undefined) return null;
  if (!Array.isArray(holders)) return '"jointHolders" must be a list';
  for (let i = 0; i < holders.length; i++) {
    const h = holders[i];
    if (!isRecord(h)) return `jointHolders[${i + 1}] is invalid`;
    if (typeof h.name !== 'string' || h.name.trim().length === 0) return `jointHolders[${i + 1}] name is required`;
    if (typeof h.dateOfBirth !== 'string' || Number.isNaN(Date.parse(h.dateOfBirth))) return `jointHolders[${i + 1}] date of birth must be a valid date`;
    if (typeof h.share !== 'number' || !Number.isFinite(h.share) || h.share < 0 || h.share > 100) return `jointHolders[${i + 1}] share must be a valid number between 0 and 100`;
  }
  const op = record.operationType;
  if (typeof op === 'string' && op !== 'single' && holders.length === 0) {
    return '"jointHolders" must include at least one holder when operation type is not single';
  }
  if (holders.length > 2) return '"jointHolders" allows at most 2 holders';
  return null;
}

function validateFinancialInstitutionExtras(record: Record<string, unknown>): string | null {
  const segments = record.segments;
  if (segments === undefined) return null;
  if (!Array.isArray(segments)) return '"segments" must be a list';
  for (const s of segments) {
    if (typeof s !== 'string' || !(INVESTMENT_SEGMENTS as readonly string[]).includes(s)) return `"segments" has an unsupported value "${String(s)}"`;
  }
  return null;
}

function recordRef(item: Record<string, unknown>, index: number): string {
  const id = typeof item.id === 'string' && item.id ? item.id : null;
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : null;
  const label = name ? `"${name}"` : id ? id : `#${index + 1}`;
  return `record ${index + 1} (${label})`;
}

function pushIssue(issues: string[], name: string, item: Record<string, unknown>, index: number, reason: string): void {
  issues.push(`${name} ${recordRef(item, index)}: ${reason}.`);
}

function validateCollection(name: string, value: unknown, fields: FieldRule[], issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`${name}: must be a list.`);
    return;
  }

  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push(`${name} ${recordRef({}, index)}: not a valid object.`);
      return;
    }
    let recordHasIssue = false;
    for (const field of fields) {
      const reason = validateField(item, field);
      if (reason) {
        pushIssue(issues, name, item, index, reason);
        recordHasIssue = true;
      }
    }
    if (fields === DEPOSIT_FIELDS) {
      const reason = validateDepositNominees(item);
      if (reason) {
        pushIssue(issues, name, item, index, reason);
        recordHasIssue = true;
      }
      const jointReason = validateDepositJointHolders(item);
      if (jointReason) {
        pushIssue(issues, name, item, index, jointReason);
        recordHasIssue = true;
      }
    }
    if (fields === FINANCIAL_INSTITUTION_FIELDS) {
      const reason = validateFinancialInstitutionExtras(item);
      if (reason) {
        pushIssue(issues, name, item, index, reason);
        recordHasIssue = true;
      }
    }

    const id = item.id;
    if (typeof id !== 'string' || id.length === 0) {
      pushIssue(issues, name, item, index, 'missing id');
      recordHasIssue = true;
    } else if (ids.has(id)) {
      pushIssue(issues, name, item, index, 'has a duplicate id');
      recordHasIssue = true;
    } else {
      ids.add(id);
    }
    void recordHasIssue;
  });
}

function formatValidationIssues(issues: string[]): string {
  const max = 12;
  const shown = issues.slice(0, max);
  const more = issues.length - shown.length;
  const header = translate(issues.length === 1 ? 'errors.backup.record' : 'errors.backup.record');
  const lines = shown.map((s) => `• ${s}`);
  if (more > 0) lines.push(`• …and ${more} more issue${more === 1 ? '' : 's'}.`);
  return `${header} Found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}

export function parseBackup(input: unknown): ApplicationBackupSchema {
  if (!isRecord(input)) fail(translate('errors.backup.notFolio'));
  if (input.app !== 'folio') fail(translate('errors.backup.notCreated'));
  if (input.schemaVersion !== 1) fail(translate('errors.backup.version'));
  if (input.baseCurrency !== 'INR') fail(translate('errors.backup.currency'));
  if (typeof input.exportedAt !== 'string' || Number.isNaN(Date.parse(input.exportedAt))) {
    fail(translate('errors.backup.timestamp'));
  }
  if (!isRecord(input.data)) fail(translate('errors.backup.noData'));

  const issues: string[] = [];
  for (const [name, fields] of COLLECTIONS) {
    validateCollection(name, input.data[name], fields, issues);
  }
  if (input.data.financialInstitutions !== undefined) {
    validateCollection('financialInstitutions', input.data.financialInstitutions, FINANCIAL_INSTITUTION_FIELDS, issues);
  } else {
    input.data.financialInstitutions = [];
  }

  if (issues.length > 0) fail(formatValidationIssues(issues));

  return input as unknown as ApplicationBackupSchema;
}
