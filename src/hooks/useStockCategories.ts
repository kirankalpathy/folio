import { useCallback } from 'react';
import type { StockCategory, StockCategoryInput } from '../types';
import {
  createStockCategory,
  deleteStockCategory,
  listStockCategories,
  updateStockCategory,
} from '../services/stockCategories';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

interface StockCategoriesQueryResult {
  categories: StockCategory[];
  error: string | null;
}

export function useStockCategories() {
  const { t } = useI18n();
  const { data } = useDbQuery<StockCategoriesQueryResult>(async () => {
    try {
      return { categories: await listStockCategories(), error: null };
    } catch (error) {
      return { categories: [], error: error instanceof Error ? error.message : t('errors.storage.read') };
    }
  }, [t]);

  const create = useCallback((input: StockCategoryInput) => createStockCategory(input), []);
  const update = useCallback((id: string, input: StockCategoryInput) => updateStockCategory(id, input), []);
  const remove = useCallback((id: string) => deleteStockCategory(id), []);

  return {
    categories: data?.categories ?? [],
    isLoading: data === undefined,
    error: data?.error ?? null,
    create,
    update,
    remove,
  };
}
