/**
 * Shared domain model for Folio.
 *
 * All monetary values are stored in INR as numbers. Dates are ISO-8601 strings
 * so they survive a JSON backup without timezone drift.
 */

export type Theme = 'light' | 'dark';

export type Exchange = 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'OTHER';
export type StockInstrument = 'equity' | 'etf' | 'reit' | 'invit';
export type BondType = 'government' | 'corporate' | 'tax-free' | 'other';
export type CouponFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly' | 'zero-coupon';
export type ProvidentFundType = 'EPF' | 'PPF' | 'VPF' | 'NPS' | 'OTHER';

export const DepositType = {
  FD: 'fd',
  RD: 'rd',
  TaxSaving: 'tax-saving',
  Savings: 'savings',
  NSC: 'nsc',
  Other: 'other',
} as const;
export type DepositType = (typeof DepositType)[keyof typeof DepositType];

export const CompoundingFrequency = {
  Annual: 'annual',
  SemiAnnual: 'semi-annual',
  Quarterly: 'quarterly',
  Monthly: 'monthly',
} as const;
export type CompoundingFrequency = (typeof CompoundingFrequency)[keyof typeof CompoundingFrequency];

export const DepositRollover = {
  None: 'none',
  Principal: 'principal',
  PrincipalInterest: 'principal-interest',
} as const;
export type DepositRollover = (typeof DepositRollover)[keyof typeof DepositRollover];

export const DepositPayoutFrequency = {
  Annual: 'annual',
  SemiAnnual: 'semi-annual',
  Quarterly: 'quarterly',
  Monthly: 'monthly',
} as const;
export type DepositPayoutFrequency = (typeof DepositPayoutFrequency)[keyof typeof DepositPayoutFrequency];
export type CommodityForm = 'physical' | 'etf' | 'sgb' | 'digital';
export type CommodityUnit = 'gram' | 'kilogram' | 'ounce' | 'unit';
export type DebtType =
  | 'home-loan'
  | 'personal-loan'
  | 'car-loan'
  | 'education-loan'
  | 'credit-card'
  | 'other';

export interface AuditFields {
  createdAt: string;
  /** Last-changed timestamp (kept in sync with updatedAt). */
  updatedAt: string;
  /** Alias for updatedAt (audit). */
  changedAt?: string;
  /** User/profile UUID that created the record. */
  createdBy?: string;
  /** User/profile UUID that last changed the record. */
  changedBy?: string;
}

export interface BaseRecord extends AuditFields {
  id: string;
  notes?: string;
}

export interface UserProfile {
  id: 'primary';
  /** Stable local user UUID (used for audit createdBy/changedBy). */
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
  changedAt?: string;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  photo?: string | null;
}

export function profileDisplayName(profile: Pick<UserProfile, 'firstName' | 'lastName'> | { fullName?: string; firstName?: string; lastName?: string }): string {
  const first = 'firstName' in profile ? (profile.firstName ?? '') : '';
  const last = 'lastName' in profile ? (profile.lastName ?? '') : '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return ('fullName' in profile ? profile.fullName : '')?.trim() || '';
}

export interface PasscodeCredential {
  id: 'primary';
  kind?: 'passcode';
  salt: string;
  hash: string;
  iterations: number;
  ledgerId?: string;
  recoveryVerifier?: string;
  recoveryAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
  changedAt?: string;
  createdBy?: string;
  changedBy?: string;
}

export type AuthStatus = 'loading' | 'setup' | 'recovery' | 'locked' | 'unlocked' | 'error';

export interface PasscodeFreeCredential {
  id: 'primary';
  kind: 'none';
  createdAt: string;
  updatedAt: string;
  changedAt?: string;
  createdBy?: string;
  changedBy?: string;
}

export type AuthCredential = PasscodeCredential | PasscodeFreeCredential;



export interface StockHolding extends BaseRecord {
  symbol: string;
  name: string;
  exchange: Exchange;
  instrument: StockInstrument;
  sector?: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  purchaseDate: string;
}

export interface BondHolding extends BaseRecord {
  name: string;
  issuer: string;
  bondType: BondType;
  units: number;
  faceValue: number;
  purchasePrice: number;
  currentPrice: number;
  couponRate: number;
  couponFrequency: CouponFrequency;
  purchaseDate: string;
  maturityDate: string;
}

export interface PFAccount extends BaseRecord {
  name: string;
  accountType: ProvidentFundType;
  institution: string;
  accountNumberLast4?: string;
  currentBalance: number;
  totalContributed: number;
  interestRate: number;
  monthlyContribution: number;
  openedOn: string;
  maturityDate?: string;
}

export const FinancialInstitutionCategory = {
  SavingsAccount: 'savings-account',
  CurrentAccount: 'current-account',
  CreditCardIssuer: 'credit-card-issuer',
  DigitalWallet: 'digital-wallet',
  InvestmentBrokerage: 'investment-brokerage',
} as const;
export type FinancialInstitutionCategory = (typeof FinancialInstitutionCategory)[keyof typeof FinancialInstitutionCategory];

export type CardNetwork = 'VISA' | 'MasterCard' | 'RuPay' | 'American Express';
export type InvestmentSegment = 'cash-equity-mf' | 'equity-fo' | 'commodities' | 'debt';

export const OperationMode = {
  Online: 'online',
  Offline: 'offline',
} as const;
export type OperationMode = (typeof OperationMode)[keyof typeof OperationMode];
export type IndianState =
  | 'Andhra Pradesh' | 'Arunachal Pradesh' | 'Assam' | 'Bihar' | 'Chhattisgarh' | 'Goa' | 'Gujarat'
  | 'Haryana' | 'Himachal Pradesh' | 'Jharkhand' | 'Karnataka' | 'Kerala' | 'Madhya Pradesh'
  | 'Maharashtra' | 'Manipur' | 'Meghalaya' | 'Mizoram' | 'Nagaland' | 'Odisha' | 'Punjab'
  | 'Rajasthan' | 'Sikkim' | 'Tamil Nadu' | 'Telangana' | 'Tripura' | 'Uttar Pradesh'
  | 'Uttarakhand' | 'West Bengal' | 'Andaman and Nicobar Islands' | 'Chandigarh'
  | 'Dadra and Nagar Haveli and Daman and Diu' | 'Delhi' | 'Jammu and Kashmir' | 'Ladakh'
  | 'Lakshadweep' | 'Puducherry';

export interface FinancialInstitution extends BaseRecord {
  name: string;
  nickname?: string;
  category: FinancialInstitutionCategory;
  operationMode?: OperationMode;
  // Savings / Current
  accountNumber?: string;
  ifscCode?: string;
  cifNumber?: string;
  branchName?: string;
  swiftCode?: string;
  // Credit Card Issuer
  cardNumber?: string;
  cardNetwork?: CardNetwork;
  creditLimit?: number;
  billingCycleDay?: number;
  // Investment & Brokerage
  dematAccountNumber?: string;
  uniqueClientCode?: string;
  dpId?: string;
  segments?: InvestmentSegment[];
  // Digital Wallet
  walletId?: string;
  linkedMobile?: string;
  upiId?: string;
  // Additional Details
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  // Legacy (read compatibility)
  addressLine1?: string;
  addressLine2?: string;
  state?: IndianState | string;
  city?: string;
  pinCode?: string;
  phoneNumber?: string;
  emailAddress?: string;
  designation?: string;
}

export type FinancialInstitutionInput = Omit<FinancialInstitution, 'id' | 'createdAt' | 'updatedAt'>;

export const INDIAN_STATES: IndianState[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

export const NomineeRelationship = {
  Spouse: 'spouse',
  Father: 'father',
  Mother: 'mother',
  Son: 'son',
  Daughter: 'daughter',
  Brother: 'brother',
  Sister: 'sister',
  Other: 'other',
} as const;
export type NomineeRelationship = (typeof NomineeRelationship)[keyof typeof NomineeRelationship];

export const DepositOperationType = {
  Single: 'single',
  Joint: 'joint',
  EitherOrSurvivor: 'either-or-survivor',
  FormerOrSurvivor: 'former-or-survivor',
} as const;
export type DepositOperationType = (typeof DepositOperationType)[keyof typeof DepositOperationType];

export interface DepositNominee {
  name: string;
  relationship: NomineeRelationship | string;
  dateOfBirth?: string;
  share: number;
}

export interface DepositJointHolder {
  name: string;
  dateOfBirth: string;
  share: number; // allocated to this holder; remainder allocated to primary holder
}

export interface DepositHolding extends BaseRecord {
  depositNumber?: string;
  name: string;
  bankName: string;
  accountNumber?: string;
  financialInstitutionId?: string;
  accountType: DepositType;
  /** Lump-sum principal for FD; for RD this stores total deposited (recurringAmount * months) for compatibility. */
  principal: number;
  /** Monthly recurring/installment amount, used for RD. */
  recurringAmount?: number;
  currentValue: number;
  interestRate: number;
  compoundingFrequency?: CompoundingFrequency;
  cumulativeInterest?: boolean;
  payoutFrequency?: DepositPayoutFrequency;
  /** Periodic interest credit amount for non-cumulative (payout) deposits. Optional; computed from interest and payout frequency when applicable. */
  interestPayoutAmount?: number;
  rollover?: DepositRollover;
  operationMode?: OperationMode;
  operationType?: DepositOperationType;
  jointHolders?: DepositJointHolder[];
  isPanLinked?: boolean;
  isTaxExempt?: boolean;
  markedAsLien?: boolean;
  lienReason?: string;
  preClosedDate?: string;
  preClosureCreditedValue?: number;
  startDate: string;
  maturityDate: string;
  notes?: string;
  nominees?: DepositNominee[];
}

export type DepositInput = Omit<DepositHolding, 'id' | 'createdAt' | 'updatedAt'>;

export interface CommodityHolding extends BaseRecord {
  name: string;
  form: CommodityForm;
  unit: CommodityUnit;
  quantity: number;
  averageCostPerUnit: number;
  currentPricePerUnit: number;
  purchaseDate: string;
}

export interface DebtItem extends BaseRecord {
  name: string;
  lender: string;
  debtType: DebtType;
  originalPrincipal: number;
  outstandingPrincipal: number;
  interestRate: number;
  emiAmount: number;
  tenureMonths: number;
  startDate: string;
  nextDueDate?: string;
}

export interface PortfolioSnapshot {
  stocks: StockHolding[];
  bonds: BondHolding[];
  pfAccounts: PFAccount[];
  deposits: DepositHolding[];
  commodities: CommodityHolding[];
  debts: DebtItem[];
}

export type AssetClassKey = 'stocks' | 'bonds' | 'pf' | 'deposits' | 'commodities' | 'debts';

export const ASSET_CLASS_KEYS = [
  'stocks',
  'bonds',
  'pf',
  'deposits',
  'commodities',
  'debts',
] as const satisfies readonly AssetClassKey[];

export interface CategoryTotals {
  currentValue: number;
  investedValue: number;
  gain: number;
  gainPercentage: number;
  count: number;
}

/** Deposit subcategories used for allocation/progress breakdown (dashboard overview). */
export type DepositAllocationKey = 'deposits-fd' | 'deposits-rd' | 'deposits-other';
export type AllocationKey = AssetClassKey | DepositAllocationKey;

export interface AllocationSlice {
  key: AllocationKey;
  value: number;
  percentage: number;
  count: number;
  kind: 'asset' | 'liability';
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalInvested: number;
  unrealisedGain: number;
  returnsPercentage: number;
  categories: Record<AssetClassKey, CategoryTotals>;
  allocations: AllocationSlice[];
  counts: Record<AssetClassKey, number>;
  isEmpty: boolean;
}

export interface ApplicationBackupData {
  stocks: StockHolding[];
  bonds: BondHolding[];
  pfAccounts: PFAccount[];
  deposits: DepositHolding[];
  commodities: CommodityHolding[];
  debts: DebtItem[];
  financialInstitutions?: FinancialInstitution[];
}

export interface ApplicationBackupSchema {
  app: 'folio';
  schemaVersion: 1;
  exportedAt: string;
  baseCurrency: 'INR';
  data: ApplicationBackupData;
}

export interface BackupRecordCounts {
  stocks: number;
  bonds: number;
  pfAccounts: number;
  deposits: number;
  commodities: number;
  debts: number;
}

export interface BackupReportRow {
  /** i18n key for the item label, or a resolved label when itemLabel is provided. */
  itemLabelKey: string;
  itemLabelParams?: Record<string, string | number>;
  /** Optional pre-resolved label (use itemLabelKey via t() when absent). */
  itemLabel?: string;
  success: number;
  errors: number;
  /** Render as an indented child row (e.g. deposit subtypes). */
  indent?: boolean;
}

export interface BackupReport {
  kind: 'export' | 'restore';
  /** Only categories/subcategories present in the backup/operation are included. */
  rows: BackupReportRow[];
}

export interface RestoreResult {
  counts: BackupRecordCounts;
  total: number;
  report: BackupReport;
}

export interface TableColumnLayout {
  key: string;
  visible: boolean;
}

export interface TableLayoutPrefs {
  columns: TableColumnLayout[];
}

export const HeaderBarPosition = {
  Integrated: 'integrated',
  Standalone: 'standalone',
} as const;
export type HeaderBarPosition = (typeof HeaderBarPosition)[keyof typeof HeaderBarPosition];

export interface AppSettings {
  id: 'primary';
  numberFormatId: import('../utils/finance').NumberFormatId;
  dateFormatId: import('../utils/date').DateFormatId;
  colorMode: 'system' | 'light' | 'dark';
  /** Show the Net worth widget in the header/title bar. (Persisted key kept as showHeaderTicker for backward compatibility.) */
  showHeaderTicker: boolean;
  /** Use Folio's experimental custom title bar (with native window controls). */
  customTitleBarEnabled?: boolean;
  headerBarPosition?: HeaderBarPosition;
  /** ISO timestamp of the last update check. */
  updatesLastCheckedAt?: string;
  /** Enable customizable data table columns/order. */
  smartTablesEnabled?: boolean;
  /** Per-table column visibility and order (keyed by table id). */
  tableLayouts?: Record<string, TableLayoutPrefs>;
  /** Custom colors for allocation/overview items (keyed by allocation key). */
  allocationColors?: Partial<Record<AllocationKey, string>>;
}
