import type { AppSettings } from '../types';
import type { NumberFormatId } from '../utils/finance';
import { setNumberFormat } from '../utils/finance';
import type { DateFormatId } from '../utils/date';
import { setDateFormat } from '../utils/date';
import { getRecord, putRecord } from './sqlite';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'primary',
  numberFormatId: 'en-IN',
  dateFormatId: 'DD MMM YYYY',
  colorMode: 'light',
  showHeaderTicker: true,
};

function normalizeTableLayouts(raw: unknown): AppSettings['tableLayouts'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: NonNullable<AppSettings['tableLayouts']> = {};
  for (const [tableId, pref] of Object.entries(raw as Record<string, unknown>)) {
    if (!pref || typeof pref !== 'object' || Array.isArray(pref)) continue;
    const cols = (pref as { columns?: unknown }).columns;
    if (!Array.isArray(cols)) continue;
    const columns = cols
      .map((c) => (c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : null))
      .filter((c): c is Record<string, unknown> => !!c && typeof c.key === 'string' && c.key.length > 0)
      .map((c) => ({ key: c.key as string, visible: c.visible !== false }));
    if (columns.length > 0) out[tableId] = { columns };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const colorMode = raw?.colorMode === 'system' || raw?.colorMode === 'dark' || raw?.colorMode === 'light' ? raw.colorMode : DEFAULT_SETTINGS.colorMode;
  return {
    id: 'primary',
    numberFormatId: (raw?.numberFormatId as NumberFormatId) || DEFAULT_SETTINGS.numberFormatId,
    dateFormatId: (raw?.dateFormatId as DateFormatId) || DEFAULT_SETTINGS.dateFormatId,
    colorMode,
    showHeaderTicker: typeof raw?.showHeaderTicker === 'boolean' ? raw.showHeaderTicker : DEFAULT_SETTINGS.showHeaderTicker,
    tableLayouts: normalizeTableLayouts(raw?.tableLayouts),
  };
}

export function applySettings(settings: AppSettings): void {
  setNumberFormat(settings.numberFormatId);
  setDateFormat(settings.dateFormatId);
}

export async function loadSettings(): Promise<AppSettings> {
  const stored = await getRecord<Partial<AppSettings>>('settings', 'primary');
  const settings = normalizeSettings(stored);
  applySettings(settings);
  return settings;
}

export async function saveSettings(settings: Omit<AppSettings, 'id'>): Promise<AppSettings> {
  const next = normalizeSettings({ ...settings, id: 'primary' });
  await putRecord('settings', 'primary', next);
  applySettings(next);
  return next;
}
