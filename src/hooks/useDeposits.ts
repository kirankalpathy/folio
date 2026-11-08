import { useCallback } from 'react';
import type { DepositHolding, DepositInput } from '../types';
import {
  createDeposit as createDepositRecord,
  deleteDeposit as deleteDepositRecord,
  listDeposits,
  updateDeposit as updateDepositRecord,
} from '../services/deposits';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

interface DepositsQueryResult {
  deposits: DepositHolding[];
  error: string | null;
}

export interface DepositsState {
  deposits: DepositHolding[];
  isLoading: boolean;
  error: string | null;
  createDeposit: (input: DepositInput) => Promise<DepositHolding>;
  updateDeposit: (id: string, input: DepositInput) => Promise<DepositHolding>;
  removeDeposit: (id: string) => Promise<void>;
}

export function useDeposits(): DepositsState {
  const { t } = useI18n();
  const { data } = useDbQuery<DepositsQueryResult>(async () => {
    try {
      return { deposits: await listDeposits(), error: null };
    } catch (error) {
      return {
        deposits: [],
        error: error instanceof Error ? error.message : t('errors.deposits.read'),
      };
    }
  }, [t]);

  const createDeposit = useCallback((input: DepositInput) => createDepositRecord(input), []);
  const updateDeposit = useCallback((id: string, input: DepositInput) => updateDepositRecord(id, input), []);
  const removeDeposit = useCallback((id: string) => deleteDepositRecord(id), []);

  return {
    deposits: data?.deposits ?? [],
    isLoading: data === undefined,
    error: data?.error ?? null,
    createDeposit,
    updateDeposit,
    removeDeposit,
  };
}
