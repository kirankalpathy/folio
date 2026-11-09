import type { DepositType } from '../../types';
import type { DepositFormValues } from './depositFormModel';

export type DepositWizardStep = 0 | 1 | 2 | 3;

export function depositStepFields(
  step: DepositWizardStep,
  accountType?: DepositType,
): Array<keyof DepositFormValues | string> {
  const isRd = accountType === 'rd';
  if (step === 0) return ['depositNumber', 'name', 'financialInstitutionId', 'accountType', 'operationType', 'jointHolders'];
  if (step === 1) {
    return [
      isRd ? 'recurringAmount' : 'principal',
      'interestRate',
      'startDate',
      'maturityDate',
      'operationMode',
      'isPanLinked',
      'isTaxExempt',
      ...(isRd ? [] : ['markedAsLien', 'lienReason']),
      'preClosedDate',
      'preClosureCreditedValue',
    ];
  }
  if (step === 2) return isRd
    ? ['interestPayoutOption', 'compoundingFrequency', 'rollover']
    : ['interestPayoutOption', 'compoundingFrequency', 'rollover'];
  return ['nominees', 'notes'];
}
