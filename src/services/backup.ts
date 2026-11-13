import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  ApplicationBackupSchema,
  BackupRecordCounts,
  BackupReport,
  BackupReportRow,
  FinancialInstitution,
  RestoreResult,
} from '../types';
import type { CompoundingFrequency, DepositHolding, DepositPayoutFrequency, DepositType } from '../types';
import { parseBackup } from '../utils/backupSchema';
import { calculateDepositAccruedValueAsOf, calculateDepositValues, sanitizeDepositLienState } from '../utils/deposits';
import { folioFileName } from '../utils/fileNaming';
import { allRecords, bulkPutRecordsSilent, clearTableSilent, withTransaction } from './sqlite';

const FINANCIAL_TABLES = ['stocks', 'bonds', 'pfAccounts', 'deposits', 'commodities', 'debts', 'financialInstitutions'] as const;
const ALL_TABLES = [...FINANCIAL_TABLES, 'profile', 'credentials'] as const;
const DEXIE_NAME = 'folio';

async function clearDexieResidue(): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DEXIE_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

function backupFileName(exportedAt: string): string {
  return folioFileName('ledgerBackup', 'json', { date: new Date(exportedAt) });
}

export function totalRecords(counts: BackupRecordCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export async function createBackup(): Promise<ApplicationBackupSchema> {
  const [stocks, bonds, pfAccounts, deposits, commodities, debts, financialInstitutions] = await Promise.all([
    allRecords('stocks'),
    allRecords('bonds'),
    allRecords('pfAccounts'),
    allRecords('deposits', 'maturityDate'),
    allRecords('commodities'),
    allRecords('debts'),
    allRecords<FinancialInstitution>('financialInstitutions'),
  ]);
  return {
    app: 'folio',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    baseCurrency: 'INR',
    data: { stocks, bonds, pfAccounts, deposits, commodities, debts, financialInstitutions } as ApplicationBackupSchema['data'],
  };
}

export function serializeBackup(backup: ApplicationBackupSchema): string {
  return JSON.stringify(backup, null, 2);
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function isDatabaseLockedError(error: unknown): boolean {
  const msg = errorDetails(error);
  return /database is locked|SQLITE_BUSY|database is busy|code\s*[:=]?\s*5\b/i.test(msg);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recomputeDepositForRestore(record: unknown): Record<string, unknown> | null {
  if (!isRecordObject(record)) return null;
  const d = record as unknown as Partial<DepositHolding> & Record<string, unknown>;
  const id = typeof d.id === 'string' ? d.id.trim() : '';
  if (!id) return null;

  const isRd = d.accountType === 'rd';
  const cumulativeInterest = isRd ? true : (d.cumulativeInterest ?? false);
  const payoutFrequency = (isRd || cumulativeInterest) ? undefined : (d.payoutFrequency as DepositPayoutFrequency | undefined);
  const compoundingFrequency = (d.compoundingFrequency ?? 'quarterly') as CompoundingFrequency;
  const principal = typeof d.principal === 'number' && Number.isFinite(d.principal) ? Math.max(0, d.principal) : 0;
  const recurringAmountRaw = typeof d.recurringAmount === 'number' && Number.isFinite(d.recurringAmount) ? Math.max(0, d.recurringAmount) : undefined;
  const interestRate = typeof d.interestRate === 'number' && Number.isFinite(d.interestRate) ? Math.max(0, d.interestRate) : 0;
  const startDate = typeof d.startDate === 'string' ? d.startDate : '';
  const maturityDate = typeof d.maturityDate === 'string' ? d.maturityDate : '';

  const computed = calculateDepositValues({
    accountType: d.accountType as DepositType | undefined,
    principal,
    recurringAmount: isRd ? recurringAmountRaw : undefined,
    interestRate,
    startDate,
    maturityDate,
    cumulativeInterest,
    compoundingFrequency,
    payoutFrequency,
  });

  const next: Record<string, unknown> = { ...d };
  next.cumulativeInterest = cumulativeInterest;
  next.payoutFrequency = payoutFrequency;
  next.compoundingFrequency = compoundingFrequency;
  if (isRd) {
    next.markedAsLien = false;
    next.lienReason = undefined;
    next.preClosedDate = undefined;
    next.preClosureCreditedValue = undefined;
    next.principal = computed.totalDeposited;
    next.recurringAmount = recurringAmountRaw;
    next.interestPayoutAmount = undefined;
  } else {
    next.recurringAmount = undefined;
    next.interestPayoutAmount =
      !cumulativeInterest && payoutFrequency && Number.isFinite(computed.interestPayoutAmount)
        ? computed.interestPayoutAmount
        : undefined;
  }

  // Enforce lien/closed invariant (lien cannot coexist with pre-closure; lien remains in-lien even if maturity passed).
  const sanitized = sanitizeDepositLienState(next as Partial<DepositHolding> & { accountType?: string });
  Object.assign(next, sanitized);

  // Accrued-to-date current value semantic.
  next.currentValue = calculateDepositAccruedValueAsOf(
    {
      accountType: next.accountType as DepositType | undefined,
      principal: typeof next.principal === 'number' ? next.principal : principal,
      recurringAmount: typeof next.recurringAmount === 'number' ? next.recurringAmount : undefined,
      interestRate,
      startDate,
      maturityDate,
      cumulativeInterest,
      compoundingFrequency,
      payoutFrequency,
      preClosedDate: typeof next.preClosedDate === 'string' ? next.preClosedDate : undefined,
      preClosureCreditedValue: typeof next.preClosureCreditedValue === 'number' ? next.preClosureCreditedValue : undefined,
      markedAsLien: Boolean(next.markedAsLien),
    },
    new Date(),
  );

  const ts = typeof d.updatedAt === 'string' && d.updatedAt ? d.updatedAt : (typeof d.changedAt === 'string' && d.changedAt ? d.changedAt : new Date().toISOString());
  next.updatedAt = ts;
  if (typeof d.changedAt !== 'string' || !d.changedAt) next.changedAt = ts;
  return next;
}

interface PreparedRestore {
  records: unknown[];
  input: number;
  success: number;
  errors: number;
  depositSubtypes?: Array<{ accountType: DepositType; input: number; success: number; errors: number }>;
}

const DEPOSIT_SUBTYPE_ORDER: DepositType[] = ['fd', 'rd', 'scss', 'tax-saving', 'savings', 'nsc', 'other'];
const DEPOSIT_SUBTYPE_LABEL_KEYS: Record<DepositType, string> = {
  fd: 'deposit.account.fd',
  rd: 'deposit.account.rd',
  scss: 'deposit.account.scss',
  'tax-saving': 'deposit.account.taxSaving',
  savings: 'deposit.account.savings',
  nsc: 'deposit.account.nsc',
  other: 'deposit.account.other',
};

function normalizeDepositSubtype(value: unknown): DepositType {
  if (value === 'fd' || value === 'rd' || value === 'scss' || value === 'tax-saving' || value === 'savings' || value === 'nsc' || value === 'other') return value;
  return 'other';
}

function prepareRecordsForRestore(table: (typeof FINANCIAL_TABLES)[number], records: unknown[]): PreparedRestore {
  if (table === 'deposits') {
    const out: unknown[] = [];
    const byType = new Map<DepositType, { input: number; success: number; errors: number }>();
    for (const r of records) {
      const t = isRecordObject(r) ? normalizeDepositSubtype(r.accountType) : 'other';
      const stat = byType.get(t) ?? { input: 0, success: 0, errors: 0 };
      stat.input += 1;
      const computed = recomputeDepositForRestore(r);
      if (computed) {
        out.push(computed);
        stat.success += 1;
      } else {
        stat.errors += 1;
      }
      byType.set(t, stat);
    }
    const depositSubtypes = DEPOSIT_SUBTYPE_ORDER
      .filter((t) => (byType.get(t)?.input ?? 0) > 0)
      .map((t) => ({ accountType: t, ...(byType.get(t) ?? { input: 0, success: 0, errors: 0 }) }));
    return { records: out, input: records.length, success: out.length, errors: records.length - out.length, depositSubtypes };
  }
  // No computed persisted fields to recalculate; push records as-is.
  return { records, input: records.length, success: records.length, errors: 0 };
}

function row(itemLabelKey: string, success: number, errors: number, indent = false): BackupReportRow {
  return { itemLabelKey, success, errors, indent };
}

function buildRestoreReport(preparedByTable: Record<(typeof FINANCIAL_TABLES)[number], PreparedRestore>): BackupReport {
  const rows: BackupReportRow[] = [];
  const fi = preparedByTable.financialInstitutions;
  if (fi.input > 0) rows.push(row('backup.category.financialInstitutions', fi.success, fi.errors));

  const dep = preparedByTable.deposits;
  if (dep.input > 0) {
    rows.push(row('backup.category.deposits', dep.success, dep.errors));
    for (const sub of dep.depositSubtypes ?? []) {
      rows.push(row(DEPOSIT_SUBTYPE_LABEL_KEYS[sub.accountType], sub.success, sub.errors, true));
    }
  }

  const others: Array<{ key: (typeof FINANCIAL_TABLES)[number]; labelKey: string }> = [
    { key: 'stocks', labelKey: 'backup.category.stocks' },
    { key: 'bonds', labelKey: 'backup.category.bonds' },
    { key: 'pfAccounts', labelKey: 'backup.category.pfAccounts' },
    { key: 'commodities', labelKey: 'backup.category.commodities' },
    { key: 'debts', labelKey: 'backup.category.debts' },
  ];
  for (const o of others) {
    const p = preparedByTable[o.key];
    if (p.input > 0) rows.push(row(o.labelKey, p.success, p.errors));
  }
  return { kind: 'restore', rows };
}

export function buildExportReport(backup: ApplicationBackupSchema): BackupReport {
  const rows: BackupReportRow[] = [];
  const fi = backup.data.financialInstitutions ?? [];
  if (fi.length > 0) rows.push(row('backup.category.financialInstitutions', fi.length, 0));

  const deposits = backup.data.deposits ?? [];
  if (deposits.length > 0) {
    rows.push(row('backup.category.deposits', deposits.length, 0));
    const byType = new Map<DepositType, number>();
    for (const d of deposits) byType.set(normalizeDepositSubtype((d as { accountType?: unknown }).accountType), (byType.get(normalizeDepositSubtype((d as { accountType?: unknown }).accountType)) ?? 0) + 1);
    for (const t of DEPOSIT_SUBTYPE_ORDER) {
      const n = byType.get(t) ?? 0;
      if (n > 0) rows.push(row(DEPOSIT_SUBTYPE_LABEL_KEYS[t], n, 0, true));
    }
  }

  const others: Array<{ key: keyof ApplicationBackupSchema['data']; labelKey: string }> = [
    { key: 'stocks', labelKey: 'backup.category.stocks' },
    { key: 'bonds', labelKey: 'backup.category.bonds' },
    { key: 'pfAccounts', labelKey: 'backup.category.pfAccounts' },
    { key: 'commodities', labelKey: 'backup.category.commodities' },
    { key: 'debts', labelKey: 'backup.category.debts' },
  ];
  for (const o of others) {
    const arr = backup.data[o.key];
    const n = Array.isArray(arr) ? arr.length : 0;
    if (n > 0) rows.push(row(o.labelKey, n, 0));
  }
  return { kind: 'export', rows };
}

export async function restoreBackup(source: unknown): Promise<RestoreResult> {
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  // Always perform full schema/record validation (no bypass).
  const backup = parseBackup(parsed);
  const preparedByTable: Record<(typeof FINANCIAL_TABLES)[number], PreparedRestore> = {
    stocks: prepareRecordsForRestore('stocks', backup.data.stocks),
    bonds: prepareRecordsForRestore('bonds', backup.data.bonds),
    pfAccounts: prepareRecordsForRestore('pfAccounts', backup.data.pfAccounts),
    deposits: prepareRecordsForRestore('deposits', backup.data.deposits),
    commodities: prepareRecordsForRestore('commodities', backup.data.commodities),
    debts: prepareRecordsForRestore('debts', backup.data.debts),
    financialInstitutions: prepareRecordsForRestore('financialInstitutions', backup.data.financialInstitutions ?? []),
  };

  // All-or-nothing: do not import if any record cannot be safely prepared/recomputed.
  const prepErrors = FINANCIAL_TABLES.reduce((sum, t) => sum + preparedByTable[t].errors, 0);
  if (prepErrors > 0) {
    const report = buildRestoreReport(preparedByTable);
    throw new Error(`Restore aborted: ${prepErrors} record(s) could not be safely imported. No data was changed. ${JSON.stringify(report)}`);
  }

  const counts: BackupRecordCounts = {
    stocks: preparedByTable.stocks.success,
    bonds: preparedByTable.bonds.success,
    pfAccounts: preparedByTable.pfAccounts.success,
    deposits: preparedByTable.deposits.success,
    commodities: preparedByTable.commodities.success,
    debts: preparedByTable.debts.success,
  };
  const report = buildRestoreReport(preparedByTable);

  const maxAttempts = 6;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await withTransaction(async (db) => {
        try { await db.execute('PRAGMA busy_timeout = 8000'); } catch { /* ignore */ }
        for (const table of FINANCIAL_TABLES) await clearTableSilent(db, table);
        await bulkPutRecordsSilent(db, 'stocks', preparedByTable.stocks.records);
        await bulkPutRecordsSilent(db, 'bonds', preparedByTable.bonds.records);
        await bulkPutRecordsSilent(db, 'pfAccounts', preparedByTable.pfAccounts.records);
        await bulkPutRecordsSilent(db, 'deposits', preparedByTable.deposits.records);
        await bulkPutRecordsSilent(db, 'commodities', preparedByTable.commodities.records);
        await bulkPutRecordsSilent(db, 'debts', preparedByTable.debts.records);
        await bulkPutRecordsSilent(db, 'financialInstitutions', preparedByTable.financialInstitutions.records);
      });
      // Keep storage layers consistent: remove Dexie residue so it cannot be re-migrated over restored data.
      await clearDexieResidue();
      console.info('[folio/backup] restore complete', { counts, institutions: preparedByTable.financialInstitutions.success, attempt });
      return { counts, total: totalRecords(counts), report };
    } catch (error) {
      lastError = error;
      console.warn('[folio/backup] restore attempt failed', { attempt, maxAttempts, locked: isDatabaseLockedError(error), error: errorDetails(error) });
      if (isDatabaseLockedError(error) && attempt < maxAttempts) {
        await delay(350 * attempt);
        continue;
      }
      if (isDatabaseLockedError(error)) {
        throw new Error(
          `Database is busy/locked after ${maxAttempts} attempts. Close other Folio windows or processes using folio.db, fully restart the app, then try again. (${errorDetails(error)})`,
        );
      }
      throw error instanceof Error ? error : new Error(errorDetails(error));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not restore that backup.');
}

export async function clearFinancialRecords(): Promise<void> {
  await withTransaction(async (db) => {
    for (const table of FINANCIAL_TABLES) await clearTableSilent(db, table);
  });
  // Keep storage layers consistent and prevent Dexie residue from re-migrating.
  await clearDexieResidue();
}

export async function clearLedgerData(): Promise<void> {
  return clearFinancialRecords();
}

export async function saveBackupToChosenLocation(backup: ApplicationBackupSchema): Promise<boolean> {
  const path = await save({
    defaultPath: backupFileName(backup.exportedAt),
    filters: [{ name: 'Folio backup', extensions: ['json'] }],
    title: 'Save Folio backup',
  });
  if (!path) return false;
  await writeTextFile(path, serializeBackup(backup));
  return true;
}

export async function deleteEntireLedger(): Promise<void> {
  // Full local reset: all SQLite tables, Dexie residue, and session state.
  await withTransaction(async (db) => {
    for (const table of ALL_TABLES) await clearTableSilent(db, table);
    try { await db.execute('DELETE FROM settings'); } catch { /* ignore */ }
  });
  try { sessionStorage.clear(); } catch { /* ignore */ }
  await clearDexieResidue();
}
