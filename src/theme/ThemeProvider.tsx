import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Theme } from '../types';
import { palette } from './palette';

export type ColorMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'folio:theme';
const MODE_STORAGE_KEY = 'folio:color-mode';

function getSystemTheme(): Theme {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readInitialMode(): ColorMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // ignore
  }
  return 'light';
}

function resolveTheme(mode: ColorMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(readInitialMode);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readInitialMode()));

  useEffect(() => {
    setTheme(resolveTheme(colorMode));
  }, [colorMode]);

  useEffect(() => {
    if (colorMode !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme(getSystemTheme());
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [colorMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(MODE_STORAGE_KEY, colorMode);
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme persistence is optional.
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? palette.night : palette.paper);
    }
  }, [theme, colorMode]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setColorModeState((current) => {
      if (current === 'system') return getSystemTheme() === 'dark' ? 'light' : 'dark';
      return current === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(() => ({ theme, colorMode, setColorMode, toggleTheme }), [theme, colorMode, setColorMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
