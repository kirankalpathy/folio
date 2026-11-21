import Database from '@tauri-apps/plugin-sql';
import Dexie from 'dexie';
import type { AuthCredential, BondHolding, CommodityHolding, DebtItem, DepositHolding, PFAccount, PortfolioSnapshot, StockHolding, StockBroker, UserProfile } from '../types';
import { DEFAULT_STOCK_CATEGORIES } from '../config/stockCategories';
import { emitDbChange } from './dbEvents';

export const FOLIO_SQLITE_NAME = 'folio.db';
const DB_URL = 'sqlite:folio.db';
const DEXIE_NAME = 'folio';

type SqlValue = string | number | null;
export interface SqliteDb {
  execute: (sql: string, bind?: SqlValue[]) => Promise<{ rowsAffected: number; lastInsertId: number }>;
  select: <T = Record<string, SqlValue>>(sql: string, bind?: SqlValue[]) => Promise<T[]>;
}

type TableName = 'stockBrokers' | 'stocks' | 'stockCategories' | 'bonds' | 'pfAccounts' | 'deposits' | 'commodities' | 'debts' | 'profile' | 'credentials' | 'financialInstitutions';
const DATA_TABLES: TableName[] = ['stockBrokers', 'stocks', 'stockCategories', 'bonds', 'pfAccounts', 'deposits', 'commodities', 'debts', 'profile', 'credentials', 'financialInstitutions'];
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
  // Migrate legacy stockPortfolios table -> stockBrokers
  const hasLegacyPortfolios = await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='stockPortfolios'");
  const hasBrokers = await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='stockBrokers'");
  if (hasLegacyPortfolios.length > 0 && hasBrokers.length === 0) {
    await db.execute('ALTER TABLE stockPortfolios RENAME TO stockBrokers');
  } else if (hasLegacyPortfolios.length > 0 && hasBrokers.length > 0) {
    // both exist - move rows if brokers empty
    const brokerCount = await tableCount(db, 'stockBrokers');
    if (brokerCount === 0) {
      await db.execute('INSERT OR IGNORE INTO stockBrokers SELECT * FROM stockPortfolios');
    }
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS stockBrokers (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS stocks (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS stockCategories (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS bonds (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pfAccounts (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS deposits (id TEXT PRIMARY KEY, maturityDate TEXT, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS commodities (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS financialInstitutions (id TEXT PRIMARY KEY, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS symbolMaster (id TEXT PRIMARY KEY, source TEXT, updatedAt TEXT, createdAt TEXT, changedAt TEXT, createdBy TEXT, changedBy TEXT, data TEXT NOT NULL)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_deposits_maturity ON deposits(maturityDate)`);
  await migrateAuditColumns(db);
  try { await db.execute(`ALTER TABLE symbolMaster ADD COLUMN source TEXT`); } catch { /* column may already exist */ }
  await migrateScripMasterToSymbolMaster(db);
  await seedDefaultStockCategoriesIfNeeded(db);
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
  if (table === 'symbolMaster') {
    const source = typeof (data as any)?.source === 'string' ? (data as any).source : (extra?.source ?? null);
    await db.execute(
      `INSERT INTO symbolMaster (id, source, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET
         source=excluded.source,
         updatedAt=excluded.updatedAt,
         changedAt=excluded.changedAt,
         changedBy=excluded.changedBy,
         createdAt=COALESCE(symbolMaster.createdAt, excluded.createdAt),
         createdBy=COALESCE(symbolMaster.createdBy, excluded.createdBy),
         data=excluded.data`,
      [id, source, a.updatedAt ?? a.changedAt, a.createdAt, a.changedAt, a.createdBy, a.changedBy, json],
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
  dexie.version(1).stores({ stockBrokers: 'id', stocks: 'id', stockCategories: 'id', bonds: 'id', pfAccounts: 'id', deposits: 'id, maturityDate', commodities: 'id', debts: 'id', profile: 'id', credentials: 'id' });
  const openOk = await dexie.open().then(() => true).catch(() => false);
  if (!openOk) return;
  try {
    const safeArray = async (table: string) => { try { return await dexie.table(table).toArray(); } catch { return []; } };
    const [stockBrokers, legacyStockBrokers, stocks, stockCategories, bonds, pfAccounts, deposits, commodities, debts, profile, credentials] = await Promise.all([
      safeArray('stockBrokers'), safeArray('stockPortfolios'), safeArray('stocks'), safeArray('stockCategories'), safeArray('bonds'), safeArray('pfAccounts'), safeArray('deposits'),
      safeArray('commodities'), safeArray('debts'), safeArray('profile'), safeArray('credentials'),
    ]);
    const allStockBrokers = stockBrokers.length > 0 ? stockBrokers : legacyStockBrokers;
    const total = allStockBrokers.length + stocks.length + stockCategories.length + bonds.length + pfAccounts.length + deposits.length + commodities.length + debts.length + profile.length + credentials.length;
    if (total === 0) return;
    await db.execute('BEGIN');
    try {
      for (const row of allStockBrokers as StockBroker[]) await putJson(db, 'stockBrokers', row.id, row, { updatedAt: row.updatedAt });
      for (const row of stocks as StockHolding[]) await putJson(db, 'stocks', row.id, row, { updatedAt: row.updatedAt });
      for (const row of stockCategories as Array<Record<string, unknown>>) await putJson(db, 'stockCategories', String(row.id ?? crypto.randomUUID()), row, { updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null });
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

function normalizeLegacyRecord(table: string, value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const rec = value as Record<string, unknown>;
  if (table === 'stocks' && rec.brokerId === undefined && typeof rec.portfolioId === 'string') {
    rec.brokerId = rec.portfolioId;
  }
  if (table === 'stocks' && rec.categoryIds === undefined && typeof rec.categoryId === 'string' && rec.categoryId) {
    rec.categoryIds = [rec.categoryId];
  }
  return rec;
}

export async function allRecords<T>(table: string, orderBy?: string): Promise<T[]> {
  return runSerialized(async () => {
    const db = await getDb();
    const sql = orderBy ? `SELECT data FROM ${table} ORDER BY ${orderBy} ASC` : `SELECT data FROM ${table}`;
    const rows = await db.select<{ data: string }>(sql);
    return rows.map((r) => normalizeLegacyRecord(table, parseJson<T>(r.data))).filter((v): v is T => v !== null);
  });
}
export async function getRecord<T>(table: string, id: string): Promise<T | null> {
  return runSerialized(async () => {
    const db = await getDb();
    const rows = await db.select<{ data: string }>(`SELECT data FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
    const parsed = parseJson<T>(rows[0]?.data);
    return (parsed == null ? null : normalizeLegacyRecord(table, parsed)) as T | null;
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
  const [stockBrokers, stocks, bonds, pfAccounts, deposits, commodities, debts] = await Promise.all([
    allRecords<StockBroker>('stockBrokers'), allRecords<StockHolding>('stocks'), allRecords<BondHolding>('bonds'), allRecords<PFAccount>('pfAccounts'),
    allRecords<DepositHolding>('deposits', 'maturityDate'), allRecords<CommodityHolding>('commodities'), allRecords<DebtItem>('debts'),
  ]);
  return { stockBrokers, stocks, bonds, pfAccounts, deposits, commodities, debts };
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
  if (table === 'symbolMaster') {
    await db.execute(
      `INSERT OR REPLACE INTO symbolMaster (id, source, updatedAt, createdAt, changedAt, createdBy, changedBy, data)
       SELECT json_extract(value, '$.id'),
              json_extract(value, '$.source'),
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


async function migrateScripMasterToSymbolMaster(db: SqliteDb): Promise<void> {
  try {
    const tables = await db.select<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table' AND name='scripMaster'`);
    if (tables.length === 0) return;
    const rows = await db.select<{ id: string; data: string; updatedAt: string | null; createdAt: string | null; changedAt: string | null; createdBy: string | null; changedBy: string | null }>(
      `SELECT id, data, updatedAt, createdAt, changedAt, createdBy, changedBy FROM scripMaster`
    );
    for (const row of rows) {
      try {
        const data = JSON.parse(row.data) as Record<string, unknown>;
        if (data.scrip && !data.symbol) { data.symbol = data.scrip; delete data.scrip; }
        await db.execute(
          `INSERT OR REPLACE INTO symbolMaster (id, updatedAt, createdAt, changedAt, createdBy, changedBy, data) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [row.id, row.updatedAt, row.createdAt, row.changedAt, row.createdBy, row.changedBy, JSON.stringify(data)]
        );
      } catch { /* ignore bad row */ }
    }
    await db.execute(`DROP TABLE IF EXISTS scripMaster`);
  } catch {
    // ignore - reference data can be refreshed
  }
}
export interface SymbolMasterStats {
  count: number;
  lastUpdatedAt: string | null;
}

export interface SymbolMasterSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  series?: string;
  isin?: string;
}

export async function getSymbolMasterStats(exchange: string): Promise<SymbolMasterStats> {
  return runSerialized(async () => {
    const db = await getDb();
    const rows = await db.select<{ count: number; lastUpdatedAt: string | null }>(
      `SELECT COUNT(*) as count, MAX(updatedAt) as lastUpdatedAt
       FROM symbolMaster
       WHERE json_extract(data, '$.exchange') = $1`,
      [exchange],
    );
    return {
      count: typeof rows[0]?.count === 'number' ? rows[0].count : 0,
      lastUpdatedAt: typeof rows[0]?.lastUpdatedAt === 'string' ? rows[0].lastUpdatedAt : null,
    };
  });
}

export async function replaceSymbolMasterByExchange(exchange: string, rows: unknown[]): Promise<void> {
  return runSerialized(async () => {
    const db = await getDb();
    await db.execute('BEGIN IMMEDIATE');
    try {
      await db.execute(`DELETE FROM symbolMaster WHERE json_extract(data, '$.exchange') = $1`, [exchange]);
      if (rows.length > 0) {
        await bulkPutRecordsSilent(db, 'symbolMaster', rows);
      }
      await db.execute('COMMIT');
    } catch (e) {
      try { await db.execute('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    }
  });
}

export async function searchSymbolMaster(exchange: string, query: string, limit = 50): Promise<SymbolMasterSearchResult[]> {
  const q = query.trim().toUpperCase();
  if (q.length < 3) return [];
  return runSerialized(async () => {
    const db = await getDb();
    const like = `%${q}%`;
    const rows = await db.select<{ data: string }>(
      `SELECT data FROM symbolMaster
       WHERE json_extract(data, '$.exchange') = $1
         AND (UPPER(json_extract(data, '$.symbol')) LIKE $2 OR UPPER(json_extract(data, '$.name')) LIKE $2)
       ORDER BY
         CASE WHEN UPPER(json_extract(data, '$.symbol')) = $3 THEN 0
              WHEN UPPER(json_extract(data, '$.symbol')) LIKE $4 THEN 1
              WHEN UPPER(json_extract(data, '$.name')) LIKE $4 THEN 2
              ELSE 3 END,
         json_extract(data, '$.symbol') ASC
       LIMIT $5`,
      [exchange, like, q, `${q}%`, limit]
    );
    return rows.map((r) => {
      try {
        const d = JSON.parse(r.data) as Record<string, unknown>;
        return {
          symbol: String(d.symbol ?? ''),
          name: String(d.name ?? ''),
          exchange: String(d.exchange ?? exchange),
          series: typeof d.series === 'string' ? d.series : undefined,
          isin: typeof d.isin === 'string' ? d.isin : undefined,
        } as SymbolMasterSearchResult;
      } catch {
        return null;
      }
    }).filter((r): r is SymbolMasterSearchResult => r !== null && !!r.symbol);
  });
}


async function seedDefaultStockCategoriesIfNeeded(db: SqliteDb): Promise<void> {
  try {
    const flagId = 'stockCategoriesDefaultsSeeded_v2';
    const flagRows = await db.select<{ id: string }>(`SELECT id FROM settings WHERE id = $1 LIMIT 1`, [flagId]);
    if (flagRows.length > 0) return;
    await db.execute(`DELETE FROM stockCategories`);
    const now = new Date().toISOString();
    for (const def of DEFAULT_STOCK_CATEGORIES) {
      const record = {
        id: crypto.randomUUID(),
        name: def.category,
        description: def.description,
        type: def.type,
        preloaded: true,
        createdAt: now,
        updatedAt: now,
        changedAt: now,
      };
      const json = JSON.stringify(record);
      await db.execute(
        `INSERT OR REPLACE INTO stockCategories (id, updatedAt, createdAt, changedAt, createdBy, changedBy, data) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [record.id, now, now, now, null, null, json]
      );
    }
    const flagData = JSON.stringify({ id: flagId, seededAt: now });
    await db.execute(
      `INSERT OR REPLACE INTO settings (id, createdAt, changedAt, createdBy, changedBy, data) VALUES ($1,$2,$3,$4,$5,$6)`,
      [flagId, now, now, null, null, flagData]
    );
  } catch {
    // ignore - can be retried on next launch
  }
}
export async function resetLocalLedgerData(): Promise<void> {
  const db = await getDb();
  for (const t of DATA_TABLES) await db.execute(`DELETE FROM ${t}`);
  try { await db.execute(`DELETE FROM symbolMaster`); } catch { /* ignore */ }
  try { await db.execute(`DELETE FROM settings`); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  try { await new Promise<void>((resolve) => { const req = indexedDB.deleteDatabase(DEXIE_NAME); req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve(); }); } catch { /* ignore */ }
  setDbPromise(null);
  setTxQueue(Promise.resolve());
}
