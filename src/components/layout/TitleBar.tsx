import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { Moon, Sun } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const TITLEBAR_HEIGHT = 36;

export const FOLIO_TITLEBAR_HEIGHT = TITLEBAR_HEIGHT;
export const FOLIO_TITLEBAR_SLOT_ID = 'folio-titlebar-slot';
const HEADER_BAR_POSITION_KEY = 'folio:headerBarPosition';

function getPlatformInsets() {
  if (typeof navigator === 'undefined') return { left: 12, right: 12 };
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  const isMac = /mac/i.test(platform);
  if (isMac) {
    return { left: 78, right: 12 };
  }
  // Windows/Linux: reserve space for native caption controls on the right (overlay)
  return { left: 12, right: 140 };
}

function readHeaderBarPosition(): 'integrated' | 'standalone' {
  try {
    return localStorage.getItem(HEADER_BAR_POSITION_KEY) === 'standalone' ? 'standalone' : 'integrated';
  } catch {
    return 'integrated';
  }
}

export default function TitleBar() {
  const tauri = isTauri();
  const { status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const insets = getPlatformInsets();
  const [headerBarPosition, setHeaderBarPosition] = useState<'integrated' | 'standalone'>(readHeaderBarPosition);

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
    if (!tauri) return;
    const root = document.documentElement;
    root.style.setProperty('--folio-titlebar-height', `${TITLEBAR_HEIGHT}px`);
    root.classList.add('has-folio-titlebar');
    return () => {
      root.style.removeProperty('--folio-titlebar-height');
      root.classList.remove('has-folio-titlebar');
    };
  }, [tauri]);

  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tauri) return;
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, input, [role="button"], .ant-btn, .ant-dropdown-trigger')) return;
      const appWindow = getCurrentWindow();
      if (e.detail === 2) {
        void appWindow.toggleMaximize();
      } else {
        void appWindow.startDragging();
      }
    },
    [tauri],
  );

  if (!tauri) return null;

  const isUnlocked = status === 'unlocked';
  const showIntegratedSlot = isUnlocked && headerBarPosition === 'integrated';

  return (
    <div
      className="fixed inset-x-0 top-0 z-[500] flex h-9 select-none items-center border-b border-folio-ink/[0.07] bg-folio-shell/95 text-folio-ink backdrop-blur-sm dark:border-white/[0.07] dark:bg-folio-dark-surface/95 dark:text-folio-dark-text"
      style={{ height: TITLEBAR_HEIGHT }}
      onMouseDown={handleDragMouseDown}
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
    </div>
  );
}
