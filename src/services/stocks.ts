import type { StockHolding } from '../types';
import { StockInstrument } from '../types';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';
import { getAuditActorEmail } from './currentUser';
import { translate } from '../i18n';

export interface StockHoldingInput {
  symbol: string;
  name: string;
  exchange: StockHolding['exchange'];
  brokerId: string;
  categoryIds?: string[];
}

export async function listStockHoldings(): Promise<StockHolding[]> {
  return allRecords<StockHolding>('stocks');
}

async function assertUniqueHolding(exchange: string, symbol: string, brokerId: string | undefined, excludeId?: string): Promise<void> {
  const all = await allRecords<StockHolding>('stocks');
  const dup = all.find((h) => h.id !== excludeId && h.exchange === exchange && h.symbol.toUpperCase() === symbol.toUpperCase() && (h.brokerId ?? '') === (brokerId ?? ''));
  if (dup) throw new Error(translate('stocks.holdings.validation.unique'));
}

function assertCategoryLimit(categoryIds?: string[]): void {
  if ((categoryIds?.length ?? 0) > 5) throw new Error(translate('stocks.holdings.validation.maxCategories'));
}

function assertRequired(input: StockHoldingInput): void {
  if (!input.symbol?.trim()) throw new Error(translate('stocks.holdings.validation.symbolRequired'));
  if (!input.brokerId?.trim()) throw new Error(translate('stocks.holdings.validation.brokerRequired'));
}

export async function createStockHolding(input: StockHoldingInput): Promise<StockHolding> {
  assertRequired(input);
  assertCategoryLimit(input.categoryIds);
  await assertUniqueHolding(input.exchange, input.symbol, input.brokerId);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockHolding = {
    id: crypto.randomUUID(),
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange,
    instrument: StockInstrument.Equity,
    quantity: 0,
    averageCost: 0,
    currentPrice: 0,
    purchaseDate: now,
    brokerId: input.brokerId,
    categoryIds: input.categoryIds,
    createdAt: now,
    updatedAt: now,
    changedAt: now,
    createdBy: actor,
    changedBy: actor,
  };
  await putRecord('stocks', record.id, record, { updatedAt: now });
  return record;
}

export async function updateStockHolding(id: string, input: StockHoldingInput): Promise<StockHolding> {
  const existing = await getRecord<StockHolding>('stocks', id);
  if (!existing) throw new Error('Stock holding not found.');
  assertRequired(input);
  assertCategoryLimit(input.categoryIds);
  await assertUniqueHolding(input.exchange, input.symbol, input.brokerId, id);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockHolding = {
    ...existing,
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange,
    brokerId: input.brokerId,
    categoryIds: input.categoryIds,
    updatedAt: now,
    changedAt: now,
    changedBy: actor,
  };
  await putRecord('stocks', record.id, record, { updatedAt: now });
  return record;
}

export async function deleteStockHolding(id: string): Promise<void> {
  await deleteRecord('stocks', id);
}
