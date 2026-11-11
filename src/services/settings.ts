import type { AppSettings } from '../types';
import { HeaderBarPosition } from '../types';
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
  boldText: true,
  fontSize: 'medium',
  customTitleBarEnabled: true,
  headerBarPosition: HeaderBarPosition.Integrated,
  smartTablesEnabled: true,
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

function normalizeAllocationColors(raw: unknown): AppSettings['allocationColors'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: NonNullable<AppSettings['allocationColors']> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) {
      out[key as keyof NonNullable<AppSettings['allocationColors']>] = value.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const colorMode = raw?.colorMode === 'system' || raw?.colorMode === 'dark' || raw?.colorMode === 'light' ? raw.colorMode : DEFAULT_SETTINGS.colorMode;
  const customTitleBarEnabled = typeof raw?.customTitleBarEnabled === 'boolean' ? raw.customTitleBarEnabled : (DEFAULT_SETTINGS.customTitleBarEnabled ?? true);
  const headerBarPosition = raw?.headerBarPosition === HeaderBarPosition.Standalone ? HeaderBarPosition.Standalone : HeaderBarPosition.Integrated;
  const updatesLastCheckedAt = typeof raw?.updatesLastCheckedAt === 'string' && raw.updatesLastCheckedAt ? raw.updatesLastCheckedAt : undefined;
  const fontSize = raw?.fontSize === 'small' || raw?.fontSize === 'large' ? raw.fontSize : 'medium';
  return {
    id: 'primary',
    numberFormatId: (raw?.numberFormatId as NumberFormatId) || DEFAULT_SETTINGS.numberFormatId,
    dateFormatId: (raw?.dateFormatId as DateFormatId) || DEFAULT_SETTINGS.dateFormatId,
    colorMode,
    showHeaderTicker: typeof raw?.showHeaderTicker === 'boolean' ? raw.showHeaderTicker : DEFAULT_SETTINGS.showHeaderTicker,
    boldText: typeof raw?.boldText === 'boolean' ? raw.boldText : (DEFAULT_SETTINGS.boldText ?? true),
    fontSize,
    customTitleBarEnabled,
    headerBarPosition,
    updatesLastCheckedAt,
    smartTablesEnabled: typeof raw?.smartTablesEnabled === 'boolean' ? raw.smartTablesEnabled : (DEFAULT_SETTINGS.smartTablesEnabled ?? true),
    tableLayouts: normalizeTableLayouts(raw?.tableLayouts),
    allocationColors: normalizeAllocationColors(raw?.allocationColors),
  };
}

export const HEADER_BAR_POSITION_KEY = 'folio:headerBarPosition';
export const CUSTOM_TITLE_BAR_KEY = 'folio:customTitleBarEnabled';

const BOLD_FONT_WEIGHTS = {
  '--folio-font-weight-thin': '200',
  '--folio-font-weight-extralight': '300',
  '--folio-font-weight-light': '400',
  '--folio-font-weight-normal': '500',
  '--folio-font-weight-medium': '600',
  '--folio-font-weight-semibold': '700',
  '--folio-font-weight-bold': '800',
  '--folio-font-weight-extrabold': '900',
  '--folio-font-weight-black': '900',
} as const;

const NORMAL_FONT_WEIGHTS = {
  '--folio-font-weight-thin': '100',
  '--folio-font-weight-extralight': '200',
  '--folio-font-weight-light': '300',
  '--folio-font-weight-normal': '400',
  '--folio-font-weight-medium': '500',
  '--folio-font-weight-semibold': '600',
  '--folio-font-weight-bold': '700',
  '--folio-font-weight-extrabold': '800',
  '--folio-font-weight-black': '900',
} as const;

const TEXT_SCALE_VALUES = {
  small: '1.00',
  medium: '1.06',
  large: '1.12',
} as const;

export function applySettings(settings: AppSettings): void {
  setNumberFormat(settings.numberFormatId);
  setDateFormat(settings.dateFormatId);
  try {
    localStorage.setItem(HEADER_BAR_POSITION_KEY, settings.headerBarPosition ?? HeaderBarPosition.Integrated);
    localStorage.setItem(CUSTOM_TITLE_BAR_KEY, String(settings.customTitleBarEnabled ?? true));
    const fontWeights = settings.boldText === false ? NORMAL_FONT_WEIGHTS : BOLD_FONT_WEIGHTS;
    for (const [key, value] of Object.entries(fontWeights)) {
      document.documentElement.style.setProperty(key, value);
    }
    document.documentElement.style.setProperty('--folio-text-scale', TEXT_SCALE_VALUES[settings.fontSize ?? 'medium'] ?? TEXT_SCALE_VALUES.medium);
    window.dispatchEvent(new Event('folio:headerbarposition'));
    window.dispatchEvent(new Event('folio:customtitlebar'));
  } catch {
    // optional
  }
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
