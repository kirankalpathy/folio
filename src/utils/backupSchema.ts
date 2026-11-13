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
const DEPOSIT_TYPES = ['fd', 'rd', 'tax-saving', 'savings', 'nsc', 'scss', 'other'] as const;
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
  ['changedAt', 'date', 'optional'],
  ['createdBy', 'string', 'optional'],
  ['changedBy', 'string', 'optional'],
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
  ['interestPayoutAmount', 'number', 'optional'],
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

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
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

function resolveAuditAlias(record: Record<string, unknown>, key: string): unknown {
  const value = record[key];
  if (value !== undefined) return value;
  if (key === 'createdAt') return record.CreatedAt ?? record.created_at;
  if (key === 'updatedAt') return record.UpdatedAt ?? record.updated_at ?? record.changedAt ?? record.ChangedAt;
  if (key === 'changedAt') return record.ChangedAt ?? record.changed_at ?? record.updatedAt ?? record.UpdatedAt;
  return value;
}

function validateField(record: Record<string, unknown>, rule: FieldRule): string | null {
  const [key, kind, extra] = rule;
  const value = resolveAuditAlias(record, key);
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
    } else {
      if (!isUuid(id)) {
        pushIssue(issues, name, item, index, 'id must be a valid UUID');
        recordHasIssue = true;
      }
      if (ids.has(id)) {
        pushIssue(issues, name, item, index, 'has a duplicate id');
        recordHasIssue = true;
      } else {
        ids.add(id);
      }
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

// ---------------------------------------------------------------------------
// Structured error collection for better UX reporting
// ---------------------------------------------------------------------------

export const RestoreErrorCategory = {
  MandatoryFieldMissing: 'Mandatory field missing',
  IncorrectDataFormat: 'Incorrect data type or format',
  UnsupportedValue: 'Unsupported value',
  DuplicateRecords: 'Duplicate record',
  InvalidStructure: 'Invalid data structure',
  ConstraintViolation: 'Constraint violation',
  Other: 'Other validation errors',
} as const;
export type RestoreErrorCategory = (typeof RestoreErrorCategory)[keyof typeof RestoreErrorCategory];

export interface RestoreValidationError {
  entity: string;
  recordIndex: number;
  recordId: string;
  recordName: string;
  field: string;
  reason: string;
  category: string;
  rawValue: string;
}

export interface RestoreEntitySummary {
  /** Internal entity key (e.g. deposits, stocks). */
  key: string;
  /** i18n label key for display. */
  labelKey: string;
  total: number;
  success: number;
  /** Number of records with at least one error. */
  errors: number;
  /** Broad error categories with affected record counts for this entity. */
  errorCategories: Record<string, number>;
}

export interface RestoreErrorSummary {
  totalRecords: number;
  validRecords: number;
  errorCount: number;
  /** Overall broad error categories with affected record counts. */
  errorsByType: Record<string, number>;
  /** Per-entity success/error counts. */
  entities: RestoreEntitySummary[];
  errors: RestoreValidationError[];
}

/**
 * Validate a backup and collect structured errors instead of throwing.
 * Returns a summary with per-record errors grouped by type.
 */
export function validateBackupWithErrors(input: unknown): {
  valid: boolean;
  backup: ApplicationBackupSchema | null;
  errorSummary: RestoreErrorSummary | null;
} {
  const FIELD_LABELS: Record<string, string> = {
    id: 'Record ID',
    name: 'Name',
    symbol: 'Symbol',
    bankName: 'Bank name',
    financialInstitutionId: 'Financial institution',
    accountType: 'Account type',
    principal: 'Principal',
    interestRate: 'Interest rate',
    startDate: 'Start date',
    maturityDate: 'Maturity date',
    depositNumber: 'Deposit number',
    accountNumber: 'Account number',
    currentValue: 'Current value',
    compoundingFrequency: 'Compounding frequency',
    payoutFrequency: 'Payout frequency',
    operationMode: 'Operation mode',
    operationType: 'Operation type',
    isPanLinked: 'PAN linked',
    isTaxExempt: 'Tax exempt',
    markedAsLien: 'Marked as lien',
    lienReason: 'Lien reason',
    preClosedDate: 'Pre-closed date',
    recurringAmount: 'Recurring amount',
    interestPayoutAmount: 'Interest payout amount',
    rollover: 'Rollover',
    cumulativeInterest: 'Cumulative interest',
    exchange: 'Exchange',
    instrument: 'Instrument',
    sector: 'Sector',
    quantity: 'Quantity',
    averageCost: 'Average cost',
    currentPrice: 'Current price',
    purchaseDate: 'Purchase date',
    issuer: 'Issuer',
    bondType: 'Bond type',
    units: 'Units',
    faceValue: 'Face value',
    purchasePrice: 'Purchase price',
    couponRate: 'Coupon rate',
    couponFrequency: 'Coupon frequency',
    accountType_pf: 'Account type',
    institution: 'Institution',
    currentBalance: 'Current balance',
    totalContributed: 'Total contributed',
    monthlyContribution: 'Monthly contribution',
    openedOn: 'Opened on',
    form: 'Form',
    unit: 'Unit',
    averageCostPerUnit: 'Average cost per unit',
    currentPricePerUnit: 'Current price per unit',
    lender: 'Lender',
    debtType: 'Debt type',
    originalPrincipal: 'Original principal',
    outstandingPrincipal: 'Outstanding principal',
    emiAmount: 'EMI amount',
    tenureMonths: 'Tenure (months)',
    nextDueDate: 'Next due date',
    category: 'Category',
    nickname: 'Nickname',
    ifscCode: 'IFSC code',
    branchName: 'Branch name',
    swiftCode: 'Swift code',
    cardNumber: 'Card number',
    cardNetwork: 'Card network',
    creditLimit: 'Credit limit',
    billingCycleDay: 'Billing cycle day',
    segments: 'Segments',
    nominees: 'Nominees',
    jointHolders: 'Joint holders',
    walletId: 'Wallet ID',
    linkedMobile: 'Linked mobile',
    upiId: 'UPI ID',
    contactPerson: 'Contact person',
    contactEmail: 'Contact email',
    contactPhone: 'Contact phone',
    address: 'Address',
  };

  const emptySummary: RestoreErrorSummary = {
    totalRecords: 0,
    validRecords: 0,
    errorCount: 0,
    errorsByType: {},
    entities: [],
    errors: [],
  };

  if (!isRecord(input)) {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'root', reason: translate('errors.backup.notFolio'), category: RestoreErrorCategory.InvalidStructure, rawValue: '' }], errorCount: 1, errorsByType: { [RestoreErrorCategory.InvalidStructure]: 1 } } };
  }
  if (input.app !== 'folio') {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'app', reason: translate('errors.backup.notCreated'), category: RestoreErrorCategory.UnsupportedValue, rawValue: String(input.app) }], errorCount: 1, errorsByType: { [RestoreErrorCategory.UnsupportedValue]: 1 } } };
  }
  if (input.schemaVersion !== 1) {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'schemaVersion', reason: translate('errors.backup.version'), category: RestoreErrorCategory.UnsupportedValue, rawValue: String(input.schemaVersion) }], errorCount: 1, errorsByType: { [RestoreErrorCategory.UnsupportedValue]: 1 } } };
  }
  if (input.baseCurrency !== 'INR') {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'baseCurrency', reason: translate('errors.backup.currency'), category: RestoreErrorCategory.UnsupportedValue, rawValue: String(input.baseCurrency) }], errorCount: 1, errorsByType: { [RestoreErrorCategory.UnsupportedValue]: 1 } } };
  }
  if (typeof input.exportedAt !== 'string' || Number.isNaN(Date.parse(input.exportedAt))) {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'exportedAt', reason: translate('errors.backup.timestamp'), category: RestoreErrorCategory.IncorrectDataFormat, rawValue: String(input.exportedAt) }], errorCount: 1, errorsByType: { [RestoreErrorCategory.IncorrectDataFormat]: 1 } } };
  }
  if (!isRecord(input.data)) {
    return { valid: false, backup: null, errorSummary: { ...emptySummary, totalRecords: 0, validRecords: 0, errors: [{ entity: 'root', recordIndex: -1, recordId: '', recordName: '', field: 'data', reason: translate('errors.backup.noData'), category: RestoreErrorCategory.InvalidStructure, rawValue: '' }], errorCount: 1, errorsByType: { [RestoreErrorCategory.InvalidStructure]: 1 } } };
  }

  const errors: RestoreValidationError[] = [];
  const errorsByType: Record<string, number> = {};
  let totalRecords = 0;

  const ENTITY_LABEL_KEYS: Record<string, string> = {
    stocks: 'backup.category.stocks',
    bonds: 'backup.category.bonds',
    pfAccounts: 'backup.category.pfAccounts',
    deposits: 'backup.category.deposits',
    commodities: 'backup.category.commodities',
    debts: 'backup.category.debts',
    financialInstitutions: 'backup.category.financialInstitutions',
  };

  function addError(entity: string, index: number, record: Record<string, unknown>, field: string, reason: string, rawValue: unknown, displayField?: string) {
    const id = typeof record.id === 'string' ? record.id : '';
    const name = typeof record.name === 'string' ? record.name : (typeof record.symbol === 'string' ? record.symbol : '');
    const friendlyField = displayField ?? FIELD_LABELS[field] ?? field;
    const friendlyReason = friendlyReasonFor(reason, field, friendlyField);
    const category = errorCategory(reason);
    errors.push({
      entity,
      recordIndex: index,
      recordId: id || `record ${index + 1}`,
      recordName: name || `Record ${index + 1}`,
      field: friendlyField,
      reason: friendlyReason,
      category,
      rawValue: rawValue === undefined ? '' : String(rawValue),
    });
    errorsByType[category] = (errorsByType[category] || 0) + 1;
  }

  function errorCategory(reason: string): RestoreErrorCategory {
    if (reason.includes('duplicate id')) return RestoreErrorCategory.DuplicateRecords;
    if (reason.includes('must be a valid UUID')) return RestoreErrorCategory.IncorrectDataFormat;
    if (reason.includes('missing required') || reason.includes('is required')) return RestoreErrorCategory.MandatoryFieldMissing;
    if (reason.includes('unsupported value')) return RestoreErrorCategory.UnsupportedValue;
    if (reason.includes('must be a list') || reason.includes('not a valid object')) return RestoreErrorCategory.InvalidStructure;
    if (reason.includes('must include at least') || reason.includes('allows at most') || reason.includes('must be between')) return RestoreErrorCategory.ConstraintViolation;
    if (reason.includes('must be a valid number') || reason.includes('must be a valid date') || reason.includes('must be text') || reason.includes('must be true or false') || reason.includes('is invalid')) return RestoreErrorCategory.IncorrectDataFormat;
    return RestoreErrorCategory.Other;
  }

  function friendlyReasonFor(reason: string, field: string, displayField?: string): string {
    const label = displayField ?? FIELD_LABELS[field] ?? field;
    if (reason.includes('missing required')) return `Missing ${label}`;
    if (reason.includes('must be a valid UUID')) return `Invalid ${label} (expected a 36-character UUID)`;
    if (reason.includes('must be a valid number')) return `Invalid ${label} (expected a number)`;
    if (reason.includes('must be a valid date')) return `Invalid ${label} (expected a date)`;
    if (reason.includes('must be text')) return `Invalid ${label} (expected text)`;
    if (reason.includes('must be true or false')) return `Invalid ${label} (expected true/false)`;
    if (reason.includes('unsupported value')) return `Unsupported ${label} value`;
    if (reason.includes('duplicate id')) return 'Duplicate record ID';
    if (reason.includes('not a valid object')) return `Invalid ${label}`;
    if (reason.includes('must be a list')) return `${label} must be a list`;
    if (reason.includes('must include at least')) return `${label} must include at least one entry`;
    if (reason.includes('allows at most')) return `${label} allows at most 2 entries`;
    if (reason.includes('must be between')) return `Invalid ${label} (out of allowed range)`;
    return reason;
  }

  // simplifyReason removed — replaced by friendlyReasonFor above

  // Validate each collection
  for (const [name, fields] of COLLECTIONS) {
    const value = input.data[name];
    if (!Array.isArray(value)) {
      addError(name, -1, {}, name, `${name}: must be a list.`, value, FIELD_LABELS[name] ?? name);
      continue;
    }
    const ids = new Set<string>();
    value.forEach((item, index) => {
      totalRecords++;
      if (!isRecord(item)) {
        addError(name, index, {}, name, 'not a valid object', item, 'Record');
        return;
      }
      for (const field of fields) {
        const [key, kind, extra] = field;
        const val = resolveAuditAlias(item, key);
        const meta = fieldMeta(extra);
        if (val === undefined) {
          if (!meta.optional) {
            addError(name, index, item, key, `missing required "${key}"`, val);
          }
          continue; // skip further checks for this field
        }
        if (kind === 'number' && (typeof val !== 'number' || !Number.isFinite(val))) {
          addError(name, index, item, key, `"${key}" must be a valid number`, val);
        }
        if (kind === 'boolean' && typeof val !== 'boolean') {
          addError(name, index, item, key, `"${key}" must be true or false`, val);
        }
        if (typeof val !== 'string' && kind !== 'number' && kind !== 'boolean') {
          addError(name, index, item, key, `"${key}" must be text`, val);
        }
        if (kind === 'date' && typeof val === 'string' && Number.isNaN(Date.parse(val))) {
          addError(name, index, item, key, `"${key}" must be a valid date`, val);
        }
        if (meta.enumValues && typeof val === 'string' && !meta.enumValues.includes(val)) {
          addError(name, index, item, key, `"${key}" has an unsupported value "${val}"`, val);
        }
      }
      // Deposit-specific validation
      if (fields === DEPOSIT_FIELDS) {
        const nominees = item.nominees;
        if (nominees !== undefined) {
          if (!Array.isArray(nominees)) {
            addError(name, index, item, 'nominees', '"nominees" must be a list', nominees, 'Nominees');
          } else {
            for (let i = 0; i < nominees.length; i++) {
              const n = nominees[i];
              const prefix = `Nominee ${i + 1}`;
              if (!isRecord(n)) {
                addError(name, index, item, 'nominees', `nominees[${i + 1}] is invalid`, n, prefix);
                continue;
              }
              if (typeof n.name !== 'string' || n.name.trim().length === 0) {
                addError(name, index, item, 'nominees', `nominees[${i + 1}] name is required`, n.name, `${prefix} - Name`);
              }
              if (typeof n.relationship !== 'string' || n.relationship.trim().length === 0) {
                addError(name, index, item, 'nominees', `nominees[${i + 1}] relationship is required`, n.relationship, `${prefix} - Relationship`);
              }
              if (typeof n.share !== 'number' || !Number.isFinite(n.share) || n.share < 0) {
                addError(name, index, item, 'nominees', `nominees[${i + 1}] share must be a valid number`, n.share, `${prefix} - Share`);
              }
              if (n.dateOfBirth !== undefined && (typeof n.dateOfBirth !== 'string' || Number.isNaN(Date.parse(n.dateOfBirth)))) {
                addError(name, index, item, 'nominees', `nominees[${i + 1}] date of birth must be a valid date`, n.dateOfBirth, `${prefix} - Date of birth`);
              }
            }
          }
        }
        const jointHolders = item.jointHolders;
        if (jointHolders !== undefined) {
          if (!Array.isArray(jointHolders)) {
            addError(name, index, item, 'jointHolders', '"jointHolders" must be a list', jointHolders, 'Joint holders');
          } else {
            for (let i = 0; i < jointHolders.length; i++) {
              const h = jointHolders[i];
              const prefix = `Joint holder ${i + 1}`;
              if (!isRecord(h)) {
                addError(name, index, item, 'jointHolders', `jointHolders[${i + 1}] is invalid`, h, prefix);
                continue;
              }
              if (typeof h.name !== 'string' || h.name.trim().length === 0) {
                addError(name, index, item, 'jointHolders', `jointHolders[${i + 1}] name is required`, h.name, `${prefix} - Name`);
              }
              if (typeof h.dateOfBirth !== 'string' || Number.isNaN(Date.parse(h.dateOfBirth))) {
                addError(name, index, item, 'jointHolders', `jointHolders[${i + 1}] date of birth must be a valid date`, h.dateOfBirth, `${prefix} - Date of birth`);
              }
              if (typeof h.share !== 'number' || !Number.isFinite(h.share) || h.share < 0 || h.share > 100) {
                addError(name, index, item, 'jointHolders', `jointHolders[${i + 1}] share must be between 0 and 100`, h.share, `${prefix} - Share`);
              }
            }
            const op = item.operationType;
            if (typeof op === 'string' && op !== 'single' && jointHolders.length === 0) {
              addError(name, index, item, 'jointHolders', 'jointHolders must include at least one holder when operation type is not single', jointHolders, 'Joint holders');
            }
            if (jointHolders.length > 2) {
              addError(name, index, item, 'jointHolders', 'jointHolders allows at most 2 holders', jointHolders, 'Joint holders');
            }
          }
        }
      }

      // Financial institution extras validation
      if (fields === FINANCIAL_INSTITUTION_FIELDS) {
        const segments = item.segments;
        if (segments !== undefined) {
          if (!Array.isArray(segments)) {
            addError(name, index, item, 'segments', '"segments" must be a list', segments, 'Segments');
          } else {
            const INVESTMENT_SEGMENTS = ['cash-equity-mf', 'equity-fo', 'commodities', 'debt'];
            for (const s of segments) {
              if (typeof s !== 'string' || !INVESTMENT_SEGMENTS.includes(s)) {
                addError(name, index, item, 'segments', `"segments" has an unsupported value "${String(s)}"`, s, 'Segments');
              }
            }
          }
        }
      }
      // ID checks: presence, UUID format, and duplicates (per collection)
      const id = item.id;
      if (typeof id !== 'string' || id.length === 0) {
        addError(name, index, item, 'id', 'missing required "id"', id);
      } else {
        if (!isUuid(id)) {
          addError(name, index, item, 'id', '"id" must be a valid UUID', id);
        }
        if (ids.has(id)) {
          addError(name, index, item, 'id', 'has a duplicate id', id);
        } else {
          ids.add(id);
        }
      }
    });
  }

  // Financial institutions
  const fiValue = input.data.financialInstitutions;
  if (fiValue !== undefined) {
    if (!Array.isArray(fiValue)) {
      addError('financialInstitutions', -1, {}, 'financialInstitutions', 'must be a list', fiValue, 'Financial Institutions');
    } else {
      const fiIds = new Set<string>();
      fiValue.forEach((item, index) => {
        totalRecords++;
        if (!isRecord(item)) {
          addError('financialInstitutions', index, {}, 'financialInstitutions', 'not a valid object', item, 'Record');
          return;
        }
        for (const field of FINANCIAL_INSTITUTION_FIELDS) {
          const [key, kind, extra] = field;
          const val = resolveAuditAlias(item, key);
          const meta = fieldMeta(extra);
          if (val === undefined) {
            if (!meta.optional) {
              addError('financialInstitutions', index, item, key, `missing required "${key}"`, val);
            }
            continue;
          }
          if (kind === 'number' && (typeof val !== 'number' || !Number.isFinite(val))) {
            addError('financialInstitutions', index, item, key, `"${key}" must be a valid number`, val);
          }
          if (kind === 'boolean' && typeof val !== 'boolean') {
            addError('financialInstitutions', index, item, key, `"${key}" must be true or false`, val);
          }
          if (typeof val !== 'string' && kind !== 'number' && kind !== 'boolean') {
            addError('financialInstitutions', index, item, key, `"${key}" must be text`, val);
          }
          if (kind === 'date' && typeof val === 'string' && Number.isNaN(Date.parse(val))) {
            addError('financialInstitutions', index, item, key, `"${key}" must be a valid date`, val);
          }
          if (meta.enumValues && typeof val === 'string' && !meta.enumValues.includes(val)) {
            addError('financialInstitutions', index, item, key, `"${key}" has an unsupported value "${val}"`, val);
          }
        }
        // ID checks: presence, UUID format, and duplicates (per collection)
        const id = item.id;
        if (typeof id !== 'string' || id.length === 0) {
          addError('financialInstitutions', index, item, 'id', 'missing required "id"', id);
        } else {
          if (!isUuid(id)) {
            addError('financialInstitutions', index, item, 'id', '"id" must be a valid UUID', id);
          }
          if (fiIds.has(id)) {
            addError('financialInstitutions', index, item, 'id', 'has a duplicate id', id);
          } else {
            fiIds.add(id);
          }
        }
      });
    }
  } else {
    input.data.financialInstitutions = [];
  }

  const valid = errors.length === 0;

  // Per-entity summaries
  const entityOrder = ['financialInstitutions', 'stocks', 'bonds', 'pfAccounts', 'deposits', 'commodities', 'debts'];
  const entities: RestoreEntitySummary[] = [];
  for (const key of entityOrder) {
    const labelKey = ENTITY_LABEL_KEYS[key] ?? key;
    let total = 0;
    const raw = input.data[key];
    if (Array.isArray(raw)) total = raw.length;
    const entityErrors = errors.filter((e) => e.entity === key);
    const errorRecordKeys = new Set(entityErrors.map((e) => `${e.entity}-${e.recordIndex}`));
    const errorRecords = errorRecordKeys.size;
    // If collection-level error (e.g. must be a list) with no items, show as 1 error
    const success = Math.max(0, total - errorRecords);
    if (total === 0 && entityErrors.length === 0) continue;
    const errorCategories: Record<string, number> = {};
    const catsByRecord = new Map<string, Set<string>>();
    for (const err of entityErrors) {
      if (!catsByRecord.has(err.category)) catsByRecord.set(err.category, new Set());
      catsByRecord.get(err.category)!.add(`${err.entity}-${err.recordIndex}`);
    }
    for (const [cat, recs] of catsByRecord) errorCategories[cat] = recs.size;
    entities.push({ key, labelKey, total, success, errors: errorRecords, errorCategories });
  }

  const errorSummary: RestoreErrorSummary = {
    totalRecords,
    validRecords: totalRecords - new Set(errors.map((e) => `${e.entity}-${e.recordIndex}`)).size,
    errorCount: errors.length,
    errorsByType: {},
    entities,
    errors,
  };

  // Group by broad category, counting unique affected records per category
  const recordsByCategory = new Map<string, Set<string>>();
  for (const err of errors) {
    if (!recordsByCategory.has(err.category)) recordsByCategory.set(err.category, new Set());
    recordsByCategory.get(err.category)!.add(`${err.entity}-${err.recordIndex}`);
  }
  const groupedByType: Record<string, number> = {};
  for (const [cat, recs] of recordsByCategory) groupedByType[cat] = recs.size;
  errorSummary.errorsByType = groupedByType;

  if (valid) {
    return { valid: true, backup: input as unknown as ApplicationBackupSchema, errorSummary: null };
  }

  return { valid: false, backup: null, errorSummary };
}
