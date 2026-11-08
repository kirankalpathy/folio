import type { ApplicationBackupSchema } from '../types';
import { translate } from '../i18n';

type FieldKind = 'string' | 'number' | 'date' | 'boolean';
type FieldRule = readonly [key: string, kind: FieldKind, extra?: 'optional' | readonly string[]];

const EXCHANGES = ['NSE', 'BSE', 'NASDAQ', 'NYSE', 'OTHER'] as const;
const STOCK_INSTRUMENTS = ['equity', 'etf', 'reit', 'invit'] as const;
const BOND_TYPES = ['government', 'corporate', 'tax-free', 'other'] as const;
const COUPON_FREQUENCIES = ['annual', 'semi-annual', 'quarterly', 'monthly', 'zero-coupon'] as const;
const PF_TYPES = ['EPF', 'PPF', 'VPF', 'NPS', 'OTHER'] as const;
const DEPOSIT_TYPES = ['fd', 'rd', 'tax-saving', 'savings', 'nsc', 'other'] as const;
const COMPOUNDING = ['annual', 'semi-annual', 'quarterly', 'monthly'] as const;
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
  ['currentValue', 'number'],
  ['interestRate', 'number'],
  ['compoundingFrequency', 'string', COMPOUNDING],
  ['cumulativeInterest', 'boolean', 'optional'],
  ['payoutFrequency', 'string', 'optional'],
  ['rollover', 'string', 'optional'],
  ['operationMode', 'string', 'optional'],
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
  ['operationMode', 'string', 'optional'],
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

function validateField(record: Record<string, unknown>, rule: FieldRule): boolean {
  const [key, kind, extra] = rule;
  const value = record[key];

  if (value === undefined) return extra === 'optional';
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  if (typeof value !== 'string') return false;
  if (kind === 'date' && Number.isNaN(Date.parse(value))) return false;
  if (Array.isArray(extra) && !extra.includes(value)) return false;
  return true;
}

function validateCollection(value: unknown, fields: FieldRule[]): void {
  if (!Array.isArray(value)) fail(translate('errors.backup.record'));

  const ids = new Set<string>();
  value.forEach((item) => {
    if (!isRecord(item)) fail(translate('errors.backup.record'));
    for (const field of fields) {
      if (!validateField(item, field)) fail(translate('errors.backup.record'));
    }

    const id = item.id;
    if (typeof id !== 'string' || id.length === 0) fail(translate('errors.backup.record'));
    if (ids.has(id)) fail(translate('errors.backup.duplicate'));
    ids.add(id);
  });
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

  for (const [name, fields] of COLLECTIONS) {
    validateCollection(input.data[name], fields);
    void name;
  }
  if (input.data.financialInstitutions !== undefined) {
    validateCollection(input.data.financialInstitutions, FINANCIAL_INSTITUTION_FIELDS);
  } else {
    input.data.financialInstitutions = [];
  }

  return input as unknown as ApplicationBackupSchema;
}
