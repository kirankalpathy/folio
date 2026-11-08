import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type { ApplicationBackupSchema, BackupRecordCounts, FinancialInstitution, RestoreResult } from '../types';
import { parseBackup } from '../utils/backupSchema';
import { allRecords, clearTableSilent, putRecordSilent, withTransaction } from './sqlite';

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

export async function restoreBackup(source: unknown): Promise<RestoreResult> {
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  const backup = parseBackup(parsed);
  const counts = countRecords(backup);
  const institutions = backup.data.financialInstitutions ?? [];
  await withTransaction(async (db) => {
    for (const table of FINANCIAL_TABLES) await clearTableSilent(db, table);
    for (const row of backup.data.stocks) await putRecordSilent(db, 'stocks', row.id, row, { updatedAt: row.updatedAt });
    for (const row of backup.data.bonds) await putRecordSilent(db, 'bonds', row.id, row, { updatedAt: row.updatedAt });
    for (const row of backup.data.pfAccounts) await putRecordSilent(db, 'pfAccounts', row.id, row, { updatedAt: row.updatedAt });
    for (const row of backup.data.deposits) await putRecordSilent(db, 'deposits', row.id, row, { maturityDate: row.maturityDate, updatedAt: row.updatedAt });
    for (const row of backup.data.commodities) await putRecordSilent(db, 'commodities', row.id, row, { updatedAt: row.updatedAt });
    for (const row of backup.data.debts) await putRecordSilent(db, 'debts', row.id, row, { updatedAt: row.updatedAt });
    for (const row of institutions) await putRecordSilent(db, 'financialInstitutions', row.id, row, { updatedAt: row.updatedAt });
  });
  return { counts, total: totalRecords(counts) };
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
