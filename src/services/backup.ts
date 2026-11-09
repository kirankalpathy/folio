import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type { ApplicationBackupSchema, BackupRecordCounts, FinancialInstitution, RestoreResult } from '../types';
import { parseBackup } from '../utils/backupSchema';
import { allRecords, bulkPutRecordsSilent, clearTableSilent, withTransaction } from './sqlite';

const FINANCIAL_TABLES = ['stocks', 'bonds', 'pfAccounts', 'deposits', 'commodities', 'debts', 'financialInstitutions'] as const;
const ALL_TABLES = [...FINANCIAL_TABLES, 'profile', 'credentials'] as const;

function countRecords(backup: ApplicationBackupSchema): BackupRecordCounts {
  return {
    stocks: backup.data.stocks.length,
    bonds: backup.data.bonds.length,
    pfAccounts: backup.data.pfAccounts.length,
    deposits: backup.data.deposits.length,
    commodities: backup.data.commodities.length,
    debts: backup.data.debts.length,
  };
}

function backupFileName(exportedAt: string): string {
  const date = new Date(exportedAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
  const time = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
  return `folio-backup-${stamp}-${time}.json`;
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

export async function restoreBackup(source: unknown): Promise<RestoreResult> {
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  // Validate the entire file first; only import when fully valid (no mid-way import).
  const backup = parseBackup(parsed);
  const counts = countRecords(backup);
  const institutions = backup.data.financialInstitutions ?? [];

  const maxAttempts = 6;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await withTransaction(async (db) => {
        try { await db.execute('PRAGMA busy_timeout = 8000'); } catch { /* ignore */ }
        for (const table of FINANCIAL_TABLES) await clearTableSilent(db, table);
        await bulkPutRecordsSilent(db, 'stocks', backup.data.stocks);
        await bulkPutRecordsSilent(db, 'bonds', backup.data.bonds);
        await bulkPutRecordsSilent(db, 'pfAccounts', backup.data.pfAccounts);
        await bulkPutRecordsSilent(db, 'deposits', backup.data.deposits);
        await bulkPutRecordsSilent(db, 'commodities', backup.data.commodities);
        await bulkPutRecordsSilent(db, 'debts', backup.data.debts);
        await bulkPutRecordsSilent(db, 'financialInstitutions', institutions);
      });
      console.info('[folio/backup] restore complete', { counts, institutions: institutions.length, attempt });
      return { counts, total: totalRecords(counts) };
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
  await withTransaction(async (db) => {
    for (const table of ALL_TABLES) await clearTableSilent(db, table);
  });
}
