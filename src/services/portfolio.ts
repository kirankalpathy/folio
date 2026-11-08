import type { PortfolioSnapshot } from '../types';
import { loadPortfolioSnapshotSqlite } from './sqlite';

export const EMPTY_PORTFOLIO: PortfolioSnapshot = {
  stocks: [],
  bonds: [],
  pfAccounts: [],
  deposits: [],
  commodities: [],
  debts: [],
};

export async function loadPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  return loadPortfolioSnapshotSqlite();
}
