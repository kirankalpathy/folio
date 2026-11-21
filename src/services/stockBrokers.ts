import type { StockHolding, StockBroker, StockBrokerInput } from '../types';
import { StockBrokerCurrency } from '../types';
import { translate } from '../i18n';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';
import { getAuditActorEmail } from './currentUser';

function normalize(input: StockBrokerInput): StockBrokerInput {
  return {
    name: input.name.trim(),
    nickname: input.nickname?.trim() || undefined,
    financialInstitutionId: input.financialInstitutionId?.trim() || undefined,
    transferAccountId: input.transferAccountId?.trim() || undefined,
    currency: input.currency === StockBrokerCurrency.INR ? StockBrokerCurrency.INR : StockBrokerCurrency.INR,
  };
}

function validate(input: StockBrokerInput): void {
  if (!input.name || input.name.trim().length < 1) {
    throw new Error(translate('stocks.brokers.validation.nameRequired'));
  }
  if (!input.financialInstitutionId) {
    throw new Error(translate('stocks.brokers.validation.institutionRequired'));
  }
  if (!input.transferAccountId) {
    throw new Error(translate('stocks.brokers.validation.transferAccountRequired'));
  }
  if (input.currency !== StockBrokerCurrency.INR) {
    throw new Error(translate('stocks.brokers.validation.currencyRequired'));
  }
}

export async function listStockBrokers(): Promise<StockBroker[]> {
  return allRecords<StockBroker>('stockBrokers');
}

export async function getStockBroker(id: string): Promise<StockBroker | null> {
  return getRecord<StockBroker>('stockBrokers', id);
}

export async function createStockBroker(input: StockBrokerInput): Promise<StockBroker> {
  const normalized = normalize(input);
  validate(normalized);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockBroker = {
    id: crypto.randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
    changedAt: now,
    createdBy: actor,
    changedBy: actor,
  };
  await putRecord('stockBrokers', record.id, record, { updatedAt: now });
  return record;
}

export async function updateStockBroker(id: string, input: StockBrokerInput): Promise<StockBroker> {
  const existing = await getRecord<StockBroker>('stockBrokers', id);
  if (!existing) throw new Error(translate('errors.storage.read'));
  const normalized = normalize(input);
  validate(normalized);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockBroker = {
    ...existing,
    ...normalized,
    updatedAt: now,
    changedAt: now,
    changedBy: actor,
  };
  await putRecord('stockBrokers', record.id, record, { updatedAt: now });
  return record;
}

export async function deleteStockBroker(id: string): Promise<void> {
  const holdings = await allRecords<StockHolding>('stocks');
  const hasHoldings = holdings.some((h) => h.brokerId === id);
  if (hasHoldings) {
    throw new Error(translate('stocks.brokers.deleteHasHoldings'));
  }
  await deleteRecord('stockBrokers', id);
}
