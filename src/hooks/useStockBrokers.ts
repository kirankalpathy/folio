import { useCallback } from 'react';
import type { StockBroker, StockBrokerInput } from '../types';
import {
  createStockBroker,
  deleteStockBroker,
  listStockBrokers,
  updateStockBroker,
} from '../services/stockBrokers';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

interface StockBrokersQueryResult {
  brokers: StockBroker[];
  error: string | null;
}

export function useStockBrokers() {
  const { t } = useI18n();
  const { data } = useDbQuery<StockBrokersQueryResult>(async () => {
    try {
      return { brokers: await listStockBrokers(), error: null };
    } catch (error) {
      return { brokers: [], error: error instanceof Error ? error.message : t('errors.storage.read') };
    }
  }, [t]);

  const create = useCallback((input: StockBrokerInput) => createStockBroker(input), []);
  const update = useCallback((id: string, input: StockBrokerInput) => updateStockBroker(id, input), []);
  const remove = useCallback((id: string) => deleteStockBroker(id), []);

  return {
    brokers: data?.brokers ?? [],
    isLoading: data === undefined,
    error: data?.error ?? null,
    create,
    update,
    remove,
  };
}
