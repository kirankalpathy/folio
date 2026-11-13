/**
 * Shared domain model for Folio.
 *
 * All monetary values are stored in INR as numbers. Dates are ISO-8601 strings
 * so they survive a JSON backup without timezone drift.
 */

export const Theme = {
  Light: 'light',
  Dark: 'dark',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const Exchange = {
  NSE: 'NSE',
  BSE: 'BSE',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  OTHER: 'OTHER',
} as const;
export type Exchange = (typeof Exchange)[keyof typeof Exchange];

export const StockInstrument = {
  Equity: 'equity',
  ETF: 'etf',
  REIT: 'reit',
  InvIT: 'invit',
} as const;
export type StockInstrument = (typeof StockInstrument)[keyof typeof StockInstrument];

export const BondType = {
  Government: 'government',
  Corporate: 'corporate',
  TaxFree: 'tax-free',
  Other: 'other',
} as const;
export type BondType = (typeof BondType)[keyof typeof BondType];

export const CouponFrequency = {
  Annual: 'annual',
  SemiAnnual: 'semi-annual',
  Quarterly: 'quarterly',
  Monthly: 'monthly',
  ZeroCoupon: 'zero-coupon',
} as const;
export type CouponFrequency = (typeof CouponFrequency)[keyof typeof CouponFrequency];

export const ProvidentFundType = {
  EPF: 'EPF',
  PPF: 'PPF',
  VPF: 'VPF',
  NPS: 'NPS',
  OTHER: 'OTHER',
} as const;
export type ProvidentFundType = (typeof ProvidentFundType)[keyof typeof ProvidentFundType];

export const DepositType = {
  FD: 'fd',
  RD: 'rd',
  TaxSaving: 'tax-saving',
  Savings: 'savings',
  NSC: 'nsc',
  SCSS: 'scss',
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
export const CommodityForm = {
  Physical: 'physical',
  ETF: 'etf',
  SGB: 'sgb',
  Digital: 'digital',
} as const;
export type CommodityForm = (typeof CommodityForm)[keyof typeof CommodityForm];

export const CommodityUnit = {
  Gram: 'gram',
  Kilogram: 'kilogram',
  Ounce: 'ounce',
  Unit: 'unit',
} as const;
export type CommodityUnit = (typeof CommodityUnit)[keyof typeof CommodityUnit];

export const DebtType = {
  HomeLoan: 'home-loan',
  PersonalLoan: 'personal-loan',
  CarLoan: 'car-loan',
  EducationLoan: 'education-loan',
  CreditCard: 'credit-card',
  Other: 'other',
} as const;
export type DebtType = (typeof DebtType)[keyof typeof DebtType];

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

export const AuthStatus = {
  Loading: 'loading',
  Setup: 'setup',
  Recovery: 'recovery',
  Locked: 'locked',
  Unlocked: 'unlocked',
  Error: 'error',
} as const;
export type AuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];

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

export const CardNetwork = {
  VISA: 'VISA',
  MasterCard: 'MasterCard',
  RuPay: 'RuPay',
  AmericanExpress: 'American Express',
} as const;
export type CardNetwork = (typeof CardNetwork)[keyof typeof CardNetwork];

export const InvestmentSegment = {
  CashEquityMF: 'cash-equity-mf',
  EquityFO: 'equity-fo',
  Commodities: 'commodities',
  Debt: 'debt',
} as const;
export type InvestmentSegment = (typeof InvestmentSegment)[keyof typeof InvestmentSegment];

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

export const AssetClassKey = {
  Stocks: 'stocks',
  Bonds: 'bonds',
  PF: 'pf',
  Deposits: 'deposits',
  Commodities: 'commodities',
  Debts: 'debts',
} as const;
export type AssetClassKey = (typeof AssetClassKey)[keyof typeof AssetClassKey];

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
export const DepositAllocationKey = {
  FD: 'deposits-fd',
  RD: 'deposits-rd',
  Other: 'deposits-other',
} as const;
export type DepositAllocationKey = (typeof DepositAllocationKey)[keyof typeof DepositAllocationKey];
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
  /** Optional error category breakdown (category -> affected record count), shown when error count is clicked. */
  errorCategories?: Record<string, number>;
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
  /** Use heavier (current) font weights when enabled; use normal font weights when disabled. */
  boldText?: boolean;
  /** Global text size scale. Defaults to medium. */
  fontSize?: 'small' | 'medium' | 'large';
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
