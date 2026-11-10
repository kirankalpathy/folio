import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settings';

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (patch: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { setColorMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await loadSettings();
      setSettings(next);
      setColorMode(next.colorMode);
    } finally {
      setLoaded(true);
    }
  }, [setColorMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateSettings = useCallback(async (patch: Partial<Omit<AppSettings, 'id'>>) => {
    const merged = { ...settings, ...patch };
    const next = await saveSettings({
      numberFormatId: merged.numberFormatId,
      dateFormatId: merged.dateFormatId,
      colorMode: merged.colorMode,
      showHeaderTicker: merged.showHeaderTicker,
      headerBarPosition: merged.headerBarPosition,
      updatesLastCheckedAt: merged.updatesLastCheckedAt,
      smartTablesEnabled: merged.smartTablesEnabled,
      tableLayouts: merged.tableLayouts,
    });
    setSettings(next);
    setColorMode(next.colorMode);
  }, [settings, setColorMode]);

  const value = useMemo(() => ({ settings, loaded, updateSettings, reload }), [settings, loaded, updateSettings, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
