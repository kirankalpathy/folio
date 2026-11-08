import { useCallback } from 'react';
import type { FinancialInstitution, FinancialInstitutionInput } from '../types';
import {
  createFinancialInstitution,
  deleteFinancialInstitution,
  listFinancialInstitutions,
  updateFinancialInstitution,
} from '../services/financialInstitutions';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

export function useFinancialInstitutions() {
  const { t } = useI18n();
  const { data } = useDbQuery<{ institutions: FinancialInstitution[]; error: string | null }>(async () => {
    try { return { institutions: await listFinancialInstitutions(), error: null }; }
    catch (error) { return { institutions: [], error: error instanceof Error ? error.message : t('errors.storage.read') }; }
  }, [t]);

  const create = useCallback((input: FinancialInstitutionInput) => createFinancialInstitution(input), []);
  const update = useCallback((id: string, input: FinancialInstitutionInput) => updateFinancialInstitution(id, input), []);
  const remove = useCallback((id: string) => deleteFinancialInstitution(id), []);

  return {
    institutions: data?.institutions ?? [],
    isLoading: data === undefined,
    error: data?.error ?? null,
    create,
    update,
    remove,
  };
}
