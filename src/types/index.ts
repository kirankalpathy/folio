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
export type DepositType = 'fd' | 'rd' | 'tax-saving' | 'savings' | 'nsc' | 'other';
export type CompoundingFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
export type DepositRollover = 'none' | 'principal' | 'principal-interest';
export type DepositPayoutFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
export type CommodityForm = 'physical' | 'etf' | 'sgb' | 'digital';
export type CommodityUnit = 'gram' | 'kilogram' | 'ounce' | 'unit';
export type DebtType =
  | 'home-loan'
  | 'personal-loan'
  | 'car-loan'
  | 'education-loan'
  | 'credit-card'
  | 'other';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface UserProfile {
  id: 'primary';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
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
}

export type AuthStatus = 'loading' | 'setup' | 'recovery' | 'locked' | 'unlocked' | 'error';

export interface PasscodeFreeCredential {
  id: 'primary';
  kind: 'none';
  createdAt: string;
  updatedAt: string;
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

export type FinancialInstitutionCategory =
  | 'savings-account'
  | 'current-account'
  | 'credit-card-issuer'
  | 'digital-wallet'
  | 'investment-brokerage';
export type CardNetwork = 'VISA' | 'MasterCard' | 'RuPay' | 'American Express';
export type InvestmentSegment = 'cash-equity-mf' | 'equity-fo' | 'commodities' | 'debt';
export type OperationMode = 'online' | 'offline';
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

export type NomineeRelationship =
  | 'spouse'
  | 'father'
  | 'mother'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'other';

export type DepositOperationType = 'single' | 'joint' | 'either-or-survivor' | 'former-or-survivor';

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
  principal: number;
  currentValue: number;
  interestRate: number;
  compoundingFrequency?: CompoundingFrequency;
  cumulativeInterest?: boolean;
  payoutFrequency?: DepositPayoutFrequency;
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

export interface AllocationSlice {
  key: AssetClassKey;
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

export interface RestoreResult {
  counts: BackupRecordCounts;
  total: number;
}

export interface AppSettings {
  id: 'primary';
  numberFormatId: import('../utils/finance').NumberFormatId;
  dateFormatId: import('../utils/date').DateFormatId;
  colorMode: 'system' | 'light' | 'dark';
  showHeaderTicker: boolean;
}
