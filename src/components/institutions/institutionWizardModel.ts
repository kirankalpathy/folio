import type {
  CardNetwork,
  FinancialInstitution,
  FinancialInstitutionCategory,
  FinancialInstitutionInput,
  InvestmentSegment,
  OperationMode,
} from '../../types';
import { formatMobileE164 } from '../common/MobileInput';

export type WizardStep = 0 | 1 | 2;

export interface InstitutionWizardValues {
  name?: string;
  nickname?: string;
  category: FinancialInstitutionCategory;
  // savings/current
  accountNumber?: string;
  ifscCode?: string;
  cifNumber?: string;
  branchName?: string;
  swiftCode?: string;
  // credit card
  cardNumber?: string;
  cardNetwork?: CardNetwork;
  creditLimit?: number;
  billingCycleDay?: number;
  // investment
  dematAccountNumber?: string;
  uniqueClientCode?: string;
  dpId?: string;
  segments?: InvestmentSegment[];
  // digital wallet
  walletId?: string;
  linkedMobile?: string;
  upiId?: string;
  // additional
  operationMode?: OperationMode;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export function defaultInstitutionValues(category: FinancialInstitutionCategory = 'savings-account'): InstitutionWizardValues {
  return {
    name: '',
    category,
    operationMode: category === 'digital-wallet' ? undefined : 'online',
    segments: [],
  };
}

export function toWizardValues(inst: FinancialInstitution): InstitutionWizardValues {
  return {
    name: inst.name,
    nickname: inst.nickname,
    category: inst.category,
    accountNumber: inst.accountNumber,
    ifscCode: inst.ifscCode,
    cifNumber: inst.cifNumber,
    branchName: inst.branchName,
    swiftCode: inst.swiftCode,
    cardNumber: inst.cardNumber,
    cardNetwork: inst.cardNetwork,
    creditLimit: inst.creditLimit,
    billingCycleDay: inst.billingCycleDay,
    dematAccountNumber: inst.dematAccountNumber,
    uniqueClientCode: inst.uniqueClientCode,
    dpId: inst.dpId,
    segments: inst.segments ?? [],
    walletId: inst.walletId,
    linkedMobile: inst.linkedMobile,
    upiId: inst.upiId,
    operationMode: inst.operationMode ?? (inst.category === 'digital-wallet' ? undefined : 'online'),
    contactPerson: inst.contactPerson,
    contactEmail: inst.contactEmail ?? inst.emailAddress,
    contactPhone: inst.contactPhone ?? inst.phoneNumber,
    address:
      inst.address ??
      ([inst.addressLine1, inst.addressLine2, inst.city, inst.state, inst.pinCode].filter(Boolean).join(', ') || undefined),
  };
}

export function toInstitutionInput(values: InstitutionWizardValues): FinancialInstitutionInput {
  return {
    name: values.name?.trim() ?? '',
    nickname: values.nickname?.trim() || undefined,
    category: values.category,
    operationMode: values.operationMode,
    accountNumber: values.accountNumber?.trim() || undefined,
    ifscCode: values.ifscCode?.trim() || undefined,
    cifNumber: values.cifNumber?.trim() || undefined,
    branchName: values.branchName?.trim() || undefined,
    swiftCode: values.swiftCode?.trim() || undefined,
    cardNumber: values.cardNumber?.trim() || undefined,
    cardNetwork: values.cardNetwork,
    creditLimit: values.creditLimit,
    billingCycleDay: values.billingCycleDay,
    dematAccountNumber: values.dematAccountNumber?.trim() || undefined,
    uniqueClientCode: values.uniqueClientCode?.trim() || undefined,
    dpId: values.dpId?.trim() || undefined,
    segments: values.segments && values.segments.length > 0 ? values.segments : undefined,
    walletId: values.walletId?.trim() || undefined,
    linkedMobile: formatMobileE164(values.linkedMobile),
    upiId: values.upiId?.trim() || undefined,
    contactPerson: values.contactPerson?.trim() || undefined,
    contactEmail: values.contactEmail?.trim() || undefined,
    contactPhone: formatMobileE164(values.contactPhone),
    address: values.address?.trim() || undefined,
  };
}

export function stepFields(step: WizardStep, category: FinancialInstitutionCategory): Array<keyof InstitutionWizardValues> {
  if (step === 0) return ['name', 'category', 'nickname'];
  if (step === 2) return ['operationMode', 'contactPerson', 'contactEmail', 'contactPhone', 'address'];
  if (category === 'savings-account' || category === 'current-account') return ['accountNumber', 'ifscCode', 'cifNumber', 'branchName', 'swiftCode', 'upiId'];
  if (category === 'credit-card-issuer') return ['cardNumber', 'cardNetwork', 'creditLimit', 'billingCycleDay'];
  if (category === 'investment-brokerage') return ['dematAccountNumber', 'uniqueClientCode', 'dpId', 'segments'];
  return ['linkedMobile', 'upiId']; // digital-wallet
}
