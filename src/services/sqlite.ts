import { isTauri } from '@tauri-apps/api/core';
import type { PortfolioSnapshot } from '../types';
import {
  allRecords as allRecordsTauri,
  bulkPutRecordsSilent as bulkPutRecordsSilentTauri,
  clearTableSilent as clearTableSilentTauri,
  deleteRecord as deleteRecordTauri,
  getDb as getDbTauri,
  getRecord as getRecordTauri,
  loadPortfolioSnapshotSqlite as loadPortfolioSnapshotSqliteTauri,
  putRecord as putRecordTauri,
  putRecordSilent as putRecordSilentTauri,
  resetLocalLedgerData as resetLocalLedgerDataTauri,
  withTransaction as withTransactionTauri,
  type SqliteDb,
} from './sqlite.tauri';

type SqlValue = string | number | null;
export type { SqliteDb };
export const FOLIO_SQLITE_NAME = 'folio.db';

function assertTauri(): void {
  if (!isTauri()) {
    throw new Error('Folio is a desktop app and must be run in Tauri.');
  }
}

export async function getDb(): Promise<SqliteDb> {
  assertTauri();
  return getDbTauri();
}

export async function allRecords<T>(table: string, orderBy?: string): Promise<T[]> {
  assertTauri();
  return allRecordsTauri<T>(table, orderBy);
}

export async function getRecord<T>(table: string, id: string): Promise<T | null> {
  assertTauri();
  return getRecordTauri<T>(table, id);
}

export async function putRecord(table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> {
  assertTauri();
  return putRecordTauri(table, id, data, extra);
}

export async function deleteRecord(table: string, id: string): Promise<void> {
  assertTauri();
  return deleteRecordTauri(table, id);
}

export async function withTransaction(fn: (db: SqliteDb) => void | Promise<void>): Promise<void> {
  assertTauri();
  return withTransactionTauri(fn);
}

export async function loadPortfolioSnapshotSqlite(): Promise<PortfolioSnapshot> {
  assertTauri();
  return loadPortfolioSnapshotSqliteTauri();
}

export async function putRecordSilent(db: SqliteDb, table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> {
  return putRecordSilentTauri(db, table, id, data, extra);
}

export async function clearTableSilent(db: SqliteDb, table: string): Promise<void> {
  return clearTableSilentTauri(db, table);
}

export async function bulkPutRecordsSilent(db: SqliteDb, table: string, rows: unknown[]): Promise<void> {
  return bulkPutRecordsSilentTauri(db, table, rows);
}

export async function resetLocalLedgerData(): Promise<void> {
  assertTauri();
  return resetLocalLedgerDataTauri();
}
