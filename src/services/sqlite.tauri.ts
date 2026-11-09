import Database from '@tauri-apps/plugin-sql';
import Dexie from 'dexie';
import type { AuthCredential, BondHolding, CommodityHolding, DebtItem, DepositHolding, PFAccount, PortfolioSnapshot, StockHolding, UserProfile } from '../types';
import { emitDbChange } from './dbEvents';

export const FOLIO_SQLITE_NAME = 'folio.db';
const DB_URL = 'sqlite:folio.db';
const DEXIE_NAME = 'folio';

type SqlValue = string | number | null;
export interface SqliteDb {
  execute: (sql: string, bind?: SqlValue[]) => Promise<{ rowsAffected: number; lastInsertId: number }>;
  select: <T = Record<string, SqlValue>>(sql: string, bind?: SqlValue[]) => Promise<T[]>;
}

type TableName = 'stocks' | 'bonds' | 'pfAccounts' | 'deposits' | 'commodities' | 'debts' | 'profile' | 'credentials' | 'financialInstitutions';
const DATA_TABLES: TableName[] = ['stocks', 'bonds', 'pfAccounts', 'deposits', 'commodities', 'debts', 'profile', 'credentials', 'financialInstitutions'];
type FolioSqliteGlobal = typeof globalThis & {
  __folioDbPromise?: Promise<SqliteDb> | null;
  __folioTxQueue?: Promise<void>;
};
const g = globalThis as FolioSqliteGlobal;
let dbPromise: Promise<SqliteDb> | null = g.__folioDbPromise ?? null;
let txQueue: Promise<void> = g.__folioTxQueue ?? Promise.resolve();

function setDbPromise(value: Promise<SqliteDb> | null): void {
  dbPromise = value;
  g.__folioDbPromise = value;
}
function setTxQueue(value: Promise<void>): void {
  txQueue = value;
  g.__folioTxQueue = value;
}

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = txQueue.then(fn, fn);
  setTxQueue(next.then(() => undefined, () => undefined));
  return next;
}

function parseJson<T>(value: SqlValue | undefined): T | null {
  if (typeof value !== 'string') return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function openDb(): Promise<SqliteDb> {
  const db = (await Database.load(DB_URL)) as unknown as SqliteDb;
  await initSchema(db);
  await migrateFromDexieIfNeeded(db);
  console.info('[folio/sqlite] local database ready (tauri)');
  return db;
}

export function getDb(): Promise<SqliteDb> {
  if (!dbPromise) setDbPromise(openDb().catch((e) => { setDbPromise(null); throw e; }));
  return dbPromise!;
}

async function initSchema(db: SqliteDb): Promise<void> {
  try { await db.execute('PRAGMA busy_timeout = 8000'); } catch { /* ignore if unsupported */ }
  try { await db.execute('PRAGMA journal_mode = WAL'); } catch { /* ignore if unsupported */ }
  try { await db.execute('PRAGMA synchronous = NORMAL'); } catch { /* ignore if unsupported */ }
  await db.execute(`CREATE TABLE IF NOT EXISTS stocks (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS bonds (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pfAccounts (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS deposits (id TEXT PRIMARY KEY, maturityDate TEXT, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS commodities (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS financialInstitutions (id TEXT PRIMARY KEY, updatedAt TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_deposits_maturity ON deposits(maturityDate)`);
}

async function tableCount(db: SqliteDb, table: string): Promise<number> {
  const rows = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return typeof rows[0]?.n === 'number' ? rows[0].n : 0;
}

async function putJson(db: SqliteDb, table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> {
  const json = JSON.stringify(data);
  if (table === 'deposits') await db.execute(`INSERT OR REPLACE INTO deposits (id, maturityDate, updatedAt, data) VALUES ($1, $2, $3, $4)`, [id, extra?.maturityDate ?? null, extra?.updatedAt ?? null, json]);
  else if (table === 'profile' || table === 'credentials' || table === 'settings') await db.execute(`INSERT OR REPLACE INTO ${table} (id, data) VALUES ($1, $2)`, [id, json]);
  else await db.execute(`INSERT OR REPLACE INTO ${table} (id, updatedAt, data) VALUES ($1, $2, $3)`, [id, extra?.updatedAt ?? null, json]);
}

function normalizeStoredProfileForMigration(row: Record<string, unknown>): UserProfile {
  const fullName = typeof row.fullName === 'string' ? row.fullName : '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    id: 'primary',
    firstName: typeof row.firstName === 'string' ? row.firstName : (parts[0] ?? ''),
    lastName: typeof row.lastName === 'string' ? row.lastName : (parts.slice(1).join(' ') || ''),
    email: typeof row.email === 'string' ? row.email : '',
    phone: typeof row.phone === 'string' ? row.phone : undefined,
    city: typeof row.city === 'string' ? row.city : undefined,
    photo: typeof row.photo === 'string' ? row.photo : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  };
}

async function migrateFromDexieIfNeeded(db: SqliteDb): Promise<void> {
  for (const t of DATA_TABLES) if ((await tableCount(db, t)) > 0) return;
  const dexie = new Dexie(DEXIE_NAME);
  dexie.version(1).stores({ stocks: 'id', bonds: 'id', pfAccounts: 'id', deposits: 'id, maturityDate', commodities: 'id', debts: 'id', profile: 'id', credentials: 'id' });
  const openOk = await dexie.open().then(() => true).catch(() => false);
  if (!openOk) return;
  try {
    const [stocks, bonds, pfAccounts, deposits, commodities, debts, profile, credentials] = await Promise.all([
      dexie.table('stocks').toArray(), dexie.table('bonds').toArray(), dexie.table('pfAccounts').toArray(), dexie.table('deposits').toArray(),
      dexie.table('commodities').toArray(), dexie.table('debts').toArray(), dexie.table('profile').toArray(), dexie.table('credentials').toArray(),
    ]);
    const total = stocks.length + bonds.length + pfAccounts.length + deposits.length + commodities.length + debts.length + profile.length + credentials.length;
    if (total === 0) return;
    await db.execute('BEGIN');
    try {
      for (const row of stocks as StockHolding[]) await putJson(db, 'stocks', row.id, row, { updatedAt: row.updatedAt });
      for (const row of bonds as BondHolding[]) await putJson(db, 'bonds', row.id, row, { updatedAt: row.updatedAt });
      for (const row of pfAccounts as PFAccount[]) await putJson(db, 'pfAccounts', row.id, row, { updatedAt: row.updatedAt });
      for (const row of deposits as DepositHolding[]) await putJson(db, 'deposits', row.id, row, { maturityDate: row.maturityDate, updatedAt: row.updatedAt });
      for (const row of commodities as CommodityHolding[]) await putJson(db, 'commodities', row.id, row, { updatedAt: row.updatedAt });
      for (const row of debts as DebtItem[]) await putJson(db, 'debts', row.id, row, { updatedAt: row.updatedAt });
      for (const row of profile as Array<Record<string, unknown>>) await putJson(db, 'profile', String(row.id ?? 'primary'), normalizeStoredProfileForMigration(row));
      for (const row of credentials as AuthCredential[]) await putJson(db, 'credentials', row.id, row);
      await db.execute('COMMIT');
    } catch (e) { await db.execute('ROLLBACK'); throw e; }
  } finally { dexie.close(); }
}

export async function allRecords<T>(table: string, orderBy?: string): Promise<T[]> {
  return runSerialized(async () => {
    const db = await getDb();
    const sql = orderBy ? `SELECT data FROM ${table} ORDER BY ${orderBy} ASC` : `SELECT data FROM ${table}`;
    const rows = await db.select<{ data: string }>(sql);
    return rows.map((r) => parseJson<T>(r.data)).filter((v): v is T => v !== null);
  });
}
export async function getRecord<T>(table: string, id: string): Promise<T | null> {
  return runSerialized(async () => {
    const db = await getDb();
    const rows = await db.select<{ data: string }>(`SELECT data FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
    return parseJson<T>(rows[0]?.data);
  });
}
export async function putRecord(table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> {
  return runSerialized(async () => {
    const db = await getDb();
    await putJson(db, table, id, data, extra);
    emitDbChange();
  });
}
export async function deleteRecord(table: string, id: string): Promise<void> {
  return runSerialized(async () => {
    const db = await getDb();
    await db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
    emitDbChange();
  });
}
export async function withTransaction(fn: (db: SqliteDb) => void | Promise<void>): Promise<void> {
  return runSerialized(async () => {
    const db = await getDb();
    try {
      await db.execute('BEGIN IMMEDIATE');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      if (/within a transaction/i.test(msg)) {
        try { await db.execute('ROLLBACK'); } catch { /* ignore */ }
        await db.execute('BEGIN IMMEDIATE');
      } else {
        throw e;
      }
    }
    try {
      await fn(db);
      await db.execute('COMMIT');
      emitDbChange();
    } catch (e) {
      try { await db.execute('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    }
  });
}
export async function loadPortfolioSnapshotSqlite(): Promise<PortfolioSnapshot> {
  const [stocks, bonds, pfAccounts, deposits, commodities, debts] = await Promise.all([
    allRecords<StockHolding>('stocks'), allRecords<BondHolding>('bonds'), allRecords<PFAccount>('pfAccounts'),
    allRecords<DepositHolding>('deposits', 'maturityDate'), allRecords<CommodityHolding>('commodities'), allRecords<DebtItem>('debts'),
  ]);
  return { stocks, bonds, pfAccounts, deposits, commodities, debts };
}
export async function putRecordSilent(db: SqliteDb, table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> { await putJson(db, table, id, data, extra); }
export async function clearTableSilent(db: SqliteDb, table: string): Promise<void> { await db.execute(`DELETE FROM ${table}`); }

export async function bulkPutRecordsSilent(db: SqliteDb, table: string, rows: unknown[]): Promise<void> {
  if (rows.length === 0) return;
  const json = JSON.stringify(rows);
  if (table === 'deposits') {
    await db.execute(
      `INSERT OR REPLACE INTO deposits (id, maturityDate, updatedAt, data)
       SELECT json_extract(value, '$.id'), json_extract(value, '$.maturityDate'), json_extract(value, '$.updatedAt'), value
       FROM json_each($1)`,
      [json],
    );
    return;
  }
  if (table === 'profile' || table === 'credentials' || table === 'settings') {
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (id, data)
       SELECT json_extract(value, '$.id'), value
       FROM json_each($1)`,
      [json],
    );
    return;
  }
  await db.execute(
    `INSERT OR REPLACE INTO ${table} (id, updatedAt, data)
     SELECT json_extract(value, '$.id'), json_extract(value, '$.updatedAt'), value
     FROM json_each($1)`,
    [json],
  );
}

export async function resetLocalLedgerData(): Promise<void> {
  const db = await getDb();
  for (const t of DATA_TABLES) await db.execute(`DELETE FROM ${t}`);
  try { sessionStorage.clear(); } catch { /* ignore */ }
  try { await new Promise<void>((resolve) => { const req = indexedDB.deleteDatabase(DEXIE_NAME); req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve(); }); } catch { /* ignore */ }
  setDbPromise(null);
  setTxQueue(Promise.resolve());
}
