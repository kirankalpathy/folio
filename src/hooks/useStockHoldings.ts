import { useCallback } from 'react';
import type { StockHolding } from '../types';
import {
  createStockHolding,
  deleteStockHolding,
  listStockHoldings,
  updateStockHolding,
  type StockHoldingInput,
} from '../services/stocks';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

interface StockHoldingsQueryResult {
  holdings: StockHolding[];
  error: string | null;
}

export function useStockHoldings() {
  const { t } = useI18n();
  const { data } = useDbQuery<StockHoldingsQueryResult>(async () => {
    try {
      return { holdings: await listStockHoldings(), error: null };
    } catch (error) {
      return { holdings: [], error: error instanceof Error ? error.message : t('errors.storage.read') };
    }
  }, [t]);

  const create = useCallback((input: StockHoldingInput) => createStockHolding(input), []);
  const update = useCallback((id: string, input: StockHoldingInput) => updateStockHolding(id, input), []);
  const remove = useCallback((id: string) => deleteStockHolding(id), []);

  return {
    holdings: data?.holdings ?? [],
    isLoading: data === undefined,
    error: data?.error ?? null,
    create,
    update,
    remove,
  };
}
