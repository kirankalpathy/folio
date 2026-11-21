import type { StockCategory, StockCategoryInput, StockHolding } from '../types';
import { translate } from '../i18n';
import { allRecords, deleteRecord, getRecord, putRecord } from './sqlite';
import { getAuditActorEmail } from './currentUser';
import { DEFAULT_STOCK_CATEGORIES } from '../config/stockCategories';

function normalize(input: StockCategoryInput): StockCategoryInput {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    type: input.type,
  };
}

function validate(input: StockCategoryInput): void {
  if (!input.name || input.name.trim().length < 1) {
    throw new Error(translate('stocks.categories.validation.nameRequired'));
  }
}

async function assertUniqueName(name: string, excludeId?: string): Promise<void> {
  const all = await allRecords<StockCategory>('stockCategories');
  const needle = name.trim().toLowerCase();
  const dup = all.find((c) => c.id !== excludeId && c.name.trim().toLowerCase() === needle);
  if (dup) throw new Error(translate('stocks.categories.validation.duplicateName'));
}

export async function listStockCategories(): Promise<StockCategory[]> {
  return allRecords<StockCategory>('stockCategories');
}

export async function createStockCategory(input: StockCategoryInput): Promise<StockCategory> {
  const normalized = normalize(input);
  validate(normalized);
  await assertUniqueName(normalized.name);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockCategory = {
    id: crypto.randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
    changedAt: now,
    createdBy: actor,
    changedBy: actor,
  };
  await putRecord('stockCategories', record.id, record, { updatedAt: now });
  return record;
}

export async function updateStockCategory(id: string, input: StockCategoryInput): Promise<StockCategory> {
  const existing = await getRecord<StockCategory>('stockCategories', id);
  if (!existing) throw new Error(translate('errors.storage.read'));
  if (existing.preloaded) throw new Error(translate('stocks.categories.validation.preloadedReadOnly'));
  const normalized = normalize(input);
  validate(normalized);
  await assertUniqueName(normalized.name, id);
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  const record: StockCategory = {
    ...existing,
    ...normalized,
    updatedAt: now,
    changedAt: now,
    changedBy: actor,
  };
  await putRecord('stockCategories', record.id, record, { updatedAt: now });
  return record;
}

export async function deleteStockCategory(id: string): Promise<void> {
  const existing = await getRecord<StockCategory>('stockCategories', id);
  if (existing?.preloaded) throw new Error(translate('stocks.categories.validation.preloadedReadOnly'));
  const holdings = await allRecords<StockHolding>('stocks');
  const affected = holdings.filter((h) => Array.isArray(h.categoryIds) && h.categoryIds.includes(id));
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  for (const h of affected) {
    const nextIds = (h.categoryIds ?? []).filter((cid) => cid !== id);
    await putRecord('stocks', h.id, { ...h, categoryIds: nextIds.length > 0 ? nextIds : undefined, updatedAt: now, changedAt: now, changedBy: actor }, { updatedAt: now });
  }
  await deleteRecord('stockCategories', id);
}

export async function seedDefaultStockCategories(): Promise<void> {
  const existing = await allRecords<StockCategory>('stockCategories');
  for (const row of existing) {
    await deleteRecord('stockCategories', row.id);
  }
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  for (const def of DEFAULT_STOCK_CATEGORIES) {
    const record: StockCategory = {
      id: crypto.randomUUID(),
      name: def.category,
      description: def.description,
      type: def.type,
      preloaded: true,
      createdAt: now,
      updatedAt: now,
      changedAt: now,
      createdBy: actor,
      changedBy: actor,
    };
    await putRecord('stockCategories', record.id, record, { updatedAt: now });
  }
}

export async function ensureDefaultStockCategories(): Promise<void> {
  const existing = await allRecords<StockCategory>('stockCategories');
  const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const now = new Date().toISOString();
  const actor = await getAuditActorEmail();
  for (const def of DEFAULT_STOCK_CATEGORIES) {
    if (existingNames.has(def.category.trim().toLowerCase())) continue;
    const record: StockCategory = {
      id: crypto.randomUUID(),
      name: def.category,
      description: def.description,
      type: def.type,
      preloaded: true,
      createdAt: now,
      updatedAt: now,
      changedAt: now,
      createdBy: actor,
      changedBy: actor,
    };
    await putRecord('stockCategories', record.id, record, { updatedAt: now });
  }
}
