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
const ALL_AUDITED_TABLES = [...DATA_TABLES, 'settings'] as const;
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

async function tryExec(db: SqliteDb, sql: string, bind?: SqlValue[]): Promise<void> {
  try { await db.execute(sql, bind); } catch { /* ignore unsupported/duplicate */ }
}

async function replaceAuditActorInTables(db: SqliteDb, oldIdentifiers: string[], newEmail: string): Promise<void> {
  const olds = Array.from(new Set(oldIdentifiers.map((v) => v?.trim()).filter((v): v is string => !!v)));
  const email = newEmail?.trim().toLowerCase();
  if (olds.length === 0 || !email) return;
  for (const table of ALL_AUDITED_TABLES) {
    for (const old of olds) {
      await tryExec(
        db,
        `UPDATE ${table}
         SET createdBy = CASE WHEN createdBy = $1 THEN $2 ELSE createdBy END,
             changedBy = CASE WHEN changedBy = $1 THEN $2 ELSE changedBy END,
             data = CASE
               WHEN json_extract(data, '$.createdBy') = $1 OR json_extract(data, '$.changedBy') = $1 OR json_extract(data, '$.CreatedBy') = $1 OR json_extract(data, '$.ChangedBy') = $1
               THEN json_set(
                 data,
                 '$.createdBy', CASE WHEN json_extract(data, '$.createdBy') = $1 THEN $2 ELSE json_extract(data, '$.createdBy') END,
                 '$.changedBy', CASE WHEN json_extract(data, '$.changedBy') = $1 THEN $2 ELSE json_extract(data, '$.changedBy') END
               )
               ELSE data
             END
         WHERE createdBy = $1 OR changedBy = $1 OR json_extract(data, '$.createdBy') = $1 OR json_extract(data, '$.changedBy') = $1 OR json_extract(data, '$.CreatedBy') = $1 OR json_extract(data, '$.ChangedBy') = $1`,
        [old, email],
      );
    }
  }
}

async function migrateAuditActorsToEmail(db: SqliteDb): Promise<void> {
  try {
    const rows = await db.select<{ data: SqlValue }>(`SELECT data FROM profile WHERE id = 'primary' LIMIT 1`);
    const profile = parseJson<Record<string, unknown>>(rows[0]?.data);
    const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';
    const userId = typeof profile?.userId === 'string' ? profile.userId.trim() : '';
    if (!email) return;
    const olds = [userId].filter(Boolean);
    if (olds.length > 0) await replaceAuditActorInTables(db, olds, email);
  } catch { /* best-effort migration */ }
}

async function migrateAuditColumns(db: SqliteDb): Promise<void> {
  for (const table of ALL_AUDITED_TABLES) {
    await tryExec(db, `ALTER TABLE ${table} ADD COLUMN createdAt TEXT`);
    await tryExec(db, `ALTER TABLE ${table} ADD COLUMN changedAt TEXT`);
    await tryExec(db, `ALTER TABLE ${table} ADD COLUMN createdBy TEXT`);
    await tryExec(db, `ALTER TABLE ${table} ADD COLUMN changedBy TEXT`);
  }
  // Backfill createdAt/changedAt from JSON when missing (best-effort).
  for (const table of ALL_AUDITED_TABLES) {
    await tryExec(
      db,
      `UPDATE ${table}
       SET createdAt = COALESCE(createdAt, json_extract(data, '$.createdAt'), json_extract(data, '$.CreatedAt')),
           changedAt = COALESCE(changedAt, json_extract(data, '$.changedAt'), json_extract(data, '$.ChangedAt'), json_extract(data, '$.updatedAt'), createdAt),
           createdBy = COALESCE(createdBy, json_extract(data, '$.createdBy'), json_extract(data, '$.CreatedBy')),
           changedBy = COALESCE(changedBy, json_extract(data, '$.changedBy'), json_extract(data, '$.ChangedBy'))
       WHERE createdAt IS NULL OR changedAt IS NULL OR (json_extract(data, '$.createdBy') IS NOT NULL AND createdBy IS NULL) OR (json_extract(data, '$.changedBy') IS NOT NULL AND changedBy IS NULL)`,
    );
  }
  await migrateAuditActorsToEmail(db);
}

async function initSchema(db: SqliteDb): Promise<void> {
  try { await db.execute('PRAGMA busy_timeout = 8000'); } catch { /* ignore if unsupported */ }
  try { await db.execute('PRAGMA journal_mode = WAL'); } catch { /* ignore if unsupported */ }
  try { await db.execute('PRAGMA synchronous = NORMAL'); } catch { /* ignore if unsupported */ }
  await db.execute(`CREATE TABLE IF NOT EXISTS stocks (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS bonds (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pfAccounts (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS deposits (id TEXT PRIMARY KEY, maturityDate TEXT, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS commodities (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS financialInstitutions (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_deposits_maturity ON deposits(maturityDate)`);
  await migrateAuditColumns(db);
}

async function tableCount(db: SqliteDb, table: string): Promise<number> {
  const rows = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return typeof rows[0]?.n === 'number' ? rows[0].n : 0;
}

function auditFromData(data: unknown, extra?: Record<string, SqlValue>): { createdAt: string | null; changedAt: string | null; createdBy: string | null; changedBy: string | null; updatedAt: string | null } {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const s = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const createdAt = s(d.createdAt) ?? s(d.CreatedAt);
  const updatedAt = s(d.updatedAt) ?? s(extra?.updatedAt) ?? s(d.changedAt) ?? s(d.ChangedAt);
  const changedAt = s(d.changedAt) ?? s(d.ChangedAt) ?? updatedAt ?? createdAt;
  const createdBy = s(d.createdBy) ?? s(d.CreatedBy);
  const changedBy = s(d.changedBy) ?? s(d.ChangedBy) ?? createdBy;
  return { createdAt, changedAt, createdBy, changedBy, updatedAt };
}

async function putJson(db: SqliteDb, table: string, id: string, data: unknown, extra?: Record<string, SqlValue>): Promise<void> {
  const json = JSON.stringify(data);
  const a = auditFromData(data, extra);
  const maturityDate = extra?.maturityDate ?? null;
  if (table === 'deposits') {
    await db.execute(
      `INSERT INTO deposits (id, maturityDate, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET
         maturityDate=excluded.maturityDate,
         updatedAt=excluded.updatedAt,
         changedAt=excluded.changedAt,
         changedBy=excluded.changedBy,
         createdAt=COALESCE(deposits.createdAt, excluded.createdAt),
         createdBy=COALESCE(deposits.createdBy, excluded.createdBy),
         data=excluded.data`,
      [id, maturityDate, a.updatedAt ?? a.changedAt, a.createdAt, a.changedAt, a.createdBy, a.changedBy, json],
    );
    return;
  }
  if (table === 'profile' || table === 'credentials' || table === 'settings') {
    await db.execute(
      `INSERT INTO ${table} (id, createdAt, changedAt, createdBy, changedBy, data)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET
         changedAt=excluded.changedAt,
         changedBy=excluded.changedBy,
         createdAt=COALESCE(${table}.createdAt, excluded.createdAt),
         createdBy=COALESCE(${table}.createdBy, excluded.createdBy),
         data=excluded.data`,
      [id, a.createdAt, a.changedAt, a.createdBy, a.changedBy, json],
    );
    return;
  }
  await db.execute(
    `INSERT INTO ${table} (id, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(id) DO UPDATE SET
       updatedAt=excluded.updatedAt,
       changedAt=excluded.changedAt,
       changedBy=excluded.changedBy,
       createdAt=COALESCE(${table}.createdAt, excluded.createdAt),
       createdBy=COALESCE(${table}.createdBy, excluded.createdBy),
       data=excluded.data`,
    [id, a.updatedAt ?? a.changedAt, a.createdAt, a.changedAt, a.createdBy, a.changedBy, json],
  );
}

function normalizeStoredProfileForMigration(row: Record<string, unknown>): UserProfile {
  const fullName = typeof row.fullName === 'string' ? row.fullName : '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const now = new Date().toISOString();
  return {
    id: 'primary',
    userId: typeof row.userId === 'string' && row.userId ? row.userId : crypto.randomUUID(),
    firstName: typeof row.firstName === 'string' ? row.firstName : (parts[0] ?? ''),
    lastName: typeof row.lastName === 'string' ? row.lastName : (parts.slice(1).join(' ') || ''),
    email: typeof row.email === 'string' ? row.email : '',
    phone: typeof row.phone === 'string' ? row.phone : undefined,
    city: typeof row.city === 'string' ? row.city : undefined,
    photo: typeof row.photo === 'string' ? row.photo : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : now,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : now,
    changedAt: typeof row.changedAt === 'string' ? row.changedAt : (typeof row.updatedAt === 'string' ? row.updatedAt : now),
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
      `INSERT OR REPLACE INTO deposits (id, maturityDate, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
       SELECT json_extract(value, '$.id'),
              json_extract(value, '$.maturityDate'),
              COALESCE(json_extract(value, '$.updatedAt'), json_extract(value, '$.changedAt'), json_extract(value, '$.ChangedAt')),
              COALESCE(json_extract(value, '$.createdAt'), json_extract(value, '$.CreatedAt')),
              COALESCE(json_extract(value, '$.changedAt'), json_extract(value, '$.ChangedAt'), json_extract(value, '$.updatedAt')),
              COALESCE(json_extract(value, '$.createdBy'), json_extract(value, '$.CreatedBy')),
              COALESCE(json_extract(value, '$.changedBy'), json_extract(value, '$.ChangedBy')),
              value
       FROM json_each($1)`,
      [json],
    );
    return;
  }
  if (table === 'profile' || table === 'credentials' || table === 'settings') {
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (id, createdAt, changedAt, createdBy, changedBy, data)
       SELECT json_extract(value, '$.id'),
              COALESCE(json_extract(value, '$.createdAt'), json_extract(value, '$.CreatedAt')),
              COALESCE(json_extract(value, '$.changedAt'), json_extract(value, '$.ChangedAt'), json_extract(value, '$.updatedAt')),
              COALESCE(json_extract(value, '$.createdBy'), json_extract(value, '$.CreatedBy')),
              COALESCE(json_extract(value, '$.changedBy'), json_extract(value, '$.ChangedBy')),
              value
       FROM json_each($1)`,
      [json],
    );
    return;
  }
  await db.execute(
    `INSERT OR REPLACE INTO ${table} (id, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
     SELECT json_extract(value, '$.id'),
            COALESCE(json_extract(value, '$.updatedAt'), json_extract(value, '$.changedAt'), json_extract(value, '$.ChangedAt')),
            COALESCE(json_extract(value, '$.createdAt'), json_extract(value, '$.CreatedAt')),
            COALESCE(json_extract(value, '$.changedAt'), json_extract(value, '$.ChangedAt'), json_extract(value, '$.updatedAt')),
            COALESCE(json_extract(value, '$.createdBy'), json_extract(value, '$.CreatedBy')),
            COALESCE(json_extract(value, '$.changedBy'), json_extract(value, '$.ChangedBy')),
            value
     FROM json_each($1)`,
    [json],
  );
}

export async function updateAuditActorInAllTables(oldIdentifiers: string[], newEmail: string): Promise<void> {
  const db = await getDb();
  await replaceAuditActorInTables(db, oldIdentifiers, newEmail);
}

export async function resetLocalLedgerData(): Promise<void> {
  const db = await getDb();
  for (const t of DATA_TABLES) await db.execute(`DELETE FROM ${t}`);
  try { await db.execute(`DELETE FROM settings`); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  try { await new Promise<void>((resolve) => { const req = indexedDB.deleteDatabase(DEXIE_NAME); req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve(); }); } catch { /* ignore */ }
  setDbPromise(null);
  setTxQueue(Promise.resolve());
}
