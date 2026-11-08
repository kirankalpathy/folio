import type { DepositFormValues } from './depositFormModel';

export type DepositWizardStep = 0 | 1 | 2 | 3;

export function depositStepFields(step: DepositWizardStep): Array<keyof DepositFormValues | string> {
  if (step === 0) return ['depositNumber', 'name', 'financialInstitutionId', 'accountType'];
  if (step === 1) return ['principal', 'interestRate', 'startDate', 'maturityDate', 'operationMode', 'markedAsLien', 'lienReason', 'preClosedDate', 'preClosureCreditedValue'];
  if (step === 2) return ['cumulativeInterest', 'compoundingFrequency', 'payoutFrequency', 'rollover'];
  return ['nominees', 'notes'];
}
