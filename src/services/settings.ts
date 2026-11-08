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

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const colorMode = raw?.colorMode === 'system' || raw?.colorMode === 'dark' || raw?.colorMode === 'light' ? raw.colorMode : DEFAULT_SETTINGS.colorMode;
  return {
    id: 'primary',
    numberFormatId: (raw?.numberFormatId as NumberFormatId) || DEFAULT_SETTINGS.numberFormatId,
    dateFormatId: (raw?.dateFormatId as DateFormatId) || DEFAULT_SETTINGS.dateFormatId,
    colorMode,
    showHeaderTicker: typeof raw?.showHeaderTicker === 'boolean' ? raw.showHeaderTicker : DEFAULT_SETTINGS.showHeaderTicker,
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
