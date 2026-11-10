import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { Copy, Minus, Moon, Square, Sun, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const TITLEBAR_HEIGHT = 36;

export const FOLIO_TITLEBAR_HEIGHT = TITLEBAR_HEIGHT;
export const FOLIO_TITLEBAR_SLOT_ID = 'folio-titlebar-slot';
const HEADER_BAR_POSITION_KEY = 'folio:headerBarPosition';
const CUSTOM_TITLE_BAR_KEY = 'folio:customTitleBarEnabled';

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /mac/i.test(platform);
}

function getPlatformInsets() {
  if (typeof navigator === 'undefined') return { left: 12, right: 12 };
  if (isMacPlatform()) {
    return { left: 78, right: 12 };
  }
  // Windows/Linux: reserve space for custom caption controls
  return { left: 12, right: 138 };
}

function readHeaderBarPosition(): 'integrated' | 'standalone' {
  try {
    return localStorage.getItem(HEADER_BAR_POSITION_KEY) === 'standalone' ? 'standalone' : 'integrated';
  } catch {
    return 'integrated';
  }
}

function readCustomTitleBarEnabled(): boolean {
  try {
    return localStorage.getItem(CUSTOM_TITLE_BAR_KEY) !== 'false';
  } catch {
    return true;
  }
}

function runWindowAction(action: () => Promise<void>) {
  void action().catch((error) => console.error('Window action failed', error));
}

export default function TitleBar() {
  const tauri = isTauri();
  const { status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const insets = getPlatformInsets();
  const [headerBarPosition, setHeaderBarPosition] = useState<'integrated' | 'standalone'>(readHeaderBarPosition);
  const [customTitleBar, setCustomTitleBar] = useState(readCustomTitleBarEnabled);
  const [isMaximized, setIsMaximized] = useState(false);
  const mac = isMacPlatform();

  useEffect(() => {
    const sync = () => setHeaderBarPosition(readHeaderBarPosition());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('folio:headerbarposition', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('folio:headerbarposition', sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const sync = () => setCustomTitleBar(readCustomTitleBarEnabled());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('folio:customtitlebar', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('folio:customtitlebar', sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!tauri) return;
    const appWindow = getCurrentWindow();
    const apply = async () => {
      try {
        if (customTitleBar) {
          if (mac) {
            await appWindow.setTitleBarStyle('overlay');
            await appWindow.setDecorations(true);
          } else {
            await appWindow.setDecorations(false);
          }
        } else {
          await appWindow.setDecorations(true);
          if (mac) {
            await appWindow.setTitleBarStyle('visible');
          }
        }
      } catch (error) {
        console.error('Failed to apply title bar style', error);
      }
    };
    void apply();
  }, [tauri, mac, customTitleBar]);

  useEffect(() => {
    if (!tauri || mac || !customTitleBar) return;
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    const sync = async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {
        // ignore
      }
    };
    void sync();
    void appWindow.onResized(() => void sync()).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [tauri, mac, customTitleBar]);

  useEffect(() => {
    if (!tauri) return;
    const root = document.documentElement;
    if (customTitleBar) {
      root.style.setProperty('--folio-titlebar-height', `${TITLEBAR_HEIGHT}px`);
      root.classList.add('has-folio-titlebar');
    } else {
      root.style.removeProperty('--folio-titlebar-height');
      root.classList.remove('has-folio-titlebar');
    }
    return () => {
      root.style.removeProperty('--folio-titlebar-height');
      root.classList.remove('has-folio-titlebar');
    };
  }, [tauri, customTitleBar]);

  if (!tauri || !customTitleBar) return null;

  const isUnlocked = status === 'unlocked';
  const showIntegratedSlot = isUnlocked && headerBarPosition === 'integrated';
  const appWindow = getCurrentWindow();

  const windowControls = !mac ? (
    <div
      data-no-drag
      data-tauri-drag-region="false"
      className="absolute right-0 top-0 flex h-full items-stretch"
    >
      <button
        type="button"
        aria-label="Minimize"
        className="inline-flex h-full w-[46px] items-center justify-center text-folio-ink/70 transition-colors hover:bg-folio-ink/[0.06] hover:text-folio-ink dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
        onClick={() => runWindowAction(() => appWindow.minimize())}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
        className="inline-flex h-full w-[46px] items-center justify-center text-folio-ink/70 transition-colors hover:bg-folio-ink/[0.06] hover:text-folio-ink dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
        onClick={() => runWindowAction(() => appWindow.toggleMaximize())}
      >
        {isMaximized ? <Copy size={13} /> : <Square size={12} />}
      </button>
      <button
        type="button"
        aria-label="Close"
        className="inline-flex h-full w-[46px] items-center justify-center text-folio-ink/70 transition-colors hover:bg-red-500/90 hover:text-white dark:text-white/70"
        onClick={() => runWindowAction(() => appWindow.close())}
      >
        <X size={15} />
      </button>
    </div>
  ) : null;

  return (
    <div
      data-tauri-drag-region="deep"
      className="fixed inset-x-0 top-0 z-[500] flex h-9 select-none items-center border-b border-folio-ink/[0.07] bg-folio-shell/95 text-folio-ink backdrop-blur-sm dark:border-white/[0.07] dark:bg-folio-dark-surface/95 dark:text-folio-dark-text"
      style={{ height: TITLEBAR_HEIGHT }}
    >
      {showIntegratedSlot ? (
        <div
          id={FOLIO_TITLEBAR_SLOT_ID}
          className="relative flex h-full w-full items-center"
          style={{ paddingLeft: insets.left, paddingRight: insets.right }}
        />
      ) : (
        <>
          <div
            className="flex h-full min-w-0 flex-1 items-center justify-center gap-2"
            style={{ paddingLeft: insets.left, paddingRight: insets.right }}
          >
            <img
              src="/folio-icon-color.svg"
              alt=""
              aria-hidden="true"
              className="h-4 w-4 shrink-0 dark:hidden"
              draggable={false}
            />
            <img
              src="/folio-icon-inverse.svg"
              alt=""
              aria-hidden="true"
              className="hidden h-4 w-4 shrink-0 dark:block"
              draggable={false}
            />
            <span className="truncate font-mono text-[11px] font-medium tracking-wide text-folio-ink/70 dark:text-white/70">
              {t('titlebar.brand')}
            </span>
          </div>
          {!isUnlocked && (
            <div
              className="absolute top-0 flex h-full items-center pr-1"
              style={{ right: insets.right }}
            >
              <Button
                type="text"
                size="small"
                aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
                icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                onClick={() => toggleTheme()}
                className="!h-7 !w-7 !min-w-0"
              />
            </div>
          )}
        </>
      )}
      {windowControls}
    </div>
  );
}
