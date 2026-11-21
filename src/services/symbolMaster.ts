import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { SYMBOL_MASTER_CONFIG } from '../config/symbolMasterConfig';
import { NseSeries, SymbolExchange, type SymbolMasterRecord } from '../types';
import { getSymbolMasterStats, replaceSymbolMasterByExchange, type SymbolMasterStats } from './sqlite';

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  const headerLine = lines[0];
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine).map((h) => h.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
    return row;
  });
}

const NSE_SERIES_VALUES = new Set<string>(Object.values(NseSeries));

function normalizeNseSeries(series: string): NseSeries | string | undefined {
  const s = series.trim().toUpperCase();
  if (!s) return undefined;
  if (NSE_SERIES_VALUES.has(s)) return s as NseSeries;
  return s;
}

async function fetchNseSource(source: { key: string; url: string }): Promise<SymbolMasterRecord[]> {
  const res = await tauriFetch(source.url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch NSE ${source.key} symbol master (${res.status})`);
  }
  const csv = await res.text();
  const rows = parseCsv(csv);
  const now = new Date().toISOString();
  return rows
    .map((r) => {
      const symbol = (r['SYMBOL'] ?? '').trim().toUpperCase();
      const name = (r['NAME OF COMPANY'] ?? r['NAME_OF_COMPANY'] ?? '').trim();
      if (!symbol || !name) return null;
      const series = normalizeNseSeries(r['SERIES'] ?? '');
      const isin = (r['ISIN NUMBER'] ?? r['ISIN_NUMBER'] ?? '').trim() || undefined;
      return {
        id: `${SymbolExchange.NSE}:${symbol}`,
        symbol,
        name,
        exchange: SymbolExchange.NSE,
        series,
        isin,
        source: source.key,
        createdAt: now,
        updatedAt: now,
        changedAt: now,
      } as SymbolMasterRecord;
    })
    .filter((r): r is SymbolMasterRecord => r !== null);
}

export async function refreshNseSymbolMaster(): Promise<SymbolMasterStats> {
  const results = await Promise.all(SYMBOL_MASTER_CONFIG.nse.sources.map((src) => fetchNseSource(src)));
  const byId = new Map<string, SymbolMasterRecord>();
  for (const rec of results.flat()) byId.set(rec.id, rec);
  const records = Array.from(byId.values());
  await replaceSymbolMasterByExchange(SymbolExchange.NSE, records);
  return getSymbolMasterStats(SymbolExchange.NSE);
}

export async function getNseSymbolMasterStats(): Promise<SymbolMasterStats> {
  return getSymbolMasterStats(SymbolExchange.NSE);
}
