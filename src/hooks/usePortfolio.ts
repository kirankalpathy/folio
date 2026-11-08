import { useMemo } from 'react';
import type { NetWorthSummary, PortfolioSnapshot } from '../types';
import { aggregateNetWorth } from '../utils/finance';
import { EMPTY_PORTFOLIO, loadPortfolioSnapshot } from '../services/portfolio';
import { useI18n } from '../i18n';
import { useDbQuery } from './useDbQuery';

interface PortfolioQueryResult {
  snapshot: PortfolioSnapshot;
  error: string | null;
}

export interface PortfolioState {
  snapshot: PortfolioSnapshot;
  summary: NetWorthSummary;
  isLoading: boolean;
  error: string | null;
}

export function usePortfolio(): PortfolioState {
  const { t } = useI18n();
  const { data } = useDbQuery<PortfolioQueryResult>(async () => {
    try {
      return { snapshot: await loadPortfolioSnapshot(), error: null };
    } catch (error) {
      return {
        snapshot: EMPTY_PORTFOLIO,
        error: error instanceof Error ? error.message : t('errors.storage.read'),
      };
    }
  }, [t]);

  const snapshot = data?.snapshot ?? EMPTY_PORTFOLIO;
  const summary = useMemo(() => aggregateNetWorth(snapshot), [snapshot]);

  return {
    snapshot,
    summary,
    isLoading: data === undefined,
    error: data?.error ?? null,
  };
}
