import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Badge, Button, Tooltip } from 'antd';
import { ArrowLeft, Bell, Menu, Moon, PanelLeft, PanelLeftClose, Sun, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useI18n } from '../../i18n';
import { cn } from '../../utils/cn';
import { useUnsavedChangesGuard } from '../common/UnsavedChangesGuard';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../context/SettingsContext';
import { formatINRCompact } from '../../utils/finance';
import { HeaderBarPosition } from '../../types';
import Sidebar from './Sidebar';
import Header from './Header';
import UserMenu from './UserMenu';
import { FOLIO_TITLEBAR_HEIGHT, FOLIO_TITLEBAR_SLOT_ID } from './TitleBar';

const SIDEBAR_KEY = 'folio:sidebar';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

function locationKey(pathname: string, search: string): string {
  return `${pathname}${search || ''}`;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { summary, isLoading } = usePortfolio();
  const { t } = useI18n();
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { confirmNavigation } = useUnsavedChangesGuard();
  const historyRef = useRef<string[]>([]);
  const skipPushRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const loc = locationKey(location.pathname, location.search);

  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      setCanGoBack(historyRef.current.length > 1);
      return;
    }
    if (navigationType === 'POP') {
      const stack = historyRef.current;
      const idx = stack.lastIndexOf(loc);
      // Real browser/POP back: truncate to the revisited entry only when moving backward.
      if (idx >= 0 && idx < stack.length - 1) {
        historyRef.current = stack.slice(0, idx + 1);
      } else if (stack[stack.length - 1] !== loc) {
        historyRef.current.push(loc);
      }
    } else if (historyRef.current[historyRef.current.length - 1] !== loc) {
      historyRef.current.push(loc);
    }
    setCanGoBack(historyRef.current.length > 1);
  }, [loc, navigationType]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // Layout preference is optional.
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleBack = () => {
    confirmNavigation(() => {
      if (historyRef.current.length > 1) {
        historyRef.current.pop();
        const prev = historyRef.current[historyRef.current.length - 1];
        if (prev) {
          skipPushRef.current = true;
          navigate(prev);
          setCanGoBack(historyRef.current.length > 1);
        }
        return;
      }
      if (window.history.length > 1) navigate(-1);
    });
  };

  const hasTitleBar = isTauri();
  const titleBarOffset = hasTitleBar ? FOLIO_TITLEBAR_HEIGHT : 0;
  const isIntegratedHeader = hasTitleBar && (settings.headerBarPosition ?? HeaderBarPosition.Integrated) === HeaderBarPosition.Integrated;

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    void updateSettings({ colorMode: next });
  };

  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasTitleBar) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, [role="button"], .ant-btn, .ant-dropdown-trigger')) return;
    const appWindow = getCurrentWindow();
    if (e.detail === 2) {
      void appWindow.toggleMaximize();
    } else {
      void appWindow.startDragging();
    }
  };

  const [titleBarSlot, setTitleBarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!hasTitleBar) {
      setTitleBarSlot(null);
      return;
    }
    const update = () => setTitleBarSlot(document.getElementById(FOLIO_TITLEBAR_SLOT_ID));
    update();
    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  });

  const titleBarControls = isIntegratedHeader && titleBarSlot ? createPortal(
    <div className="flex h-full w-full items-center gap-1" onMouseDown={handleTitleBarMouseDown}>
      <div className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-hidden">
        <Button
          type="text"
          size="small"
          className="lg:hidden !h-7 !w-7 !min-w-0"
          aria-label={t(mobileOpen ? 'nav.close' : 'nav.open')}
          icon={mobileOpen ? <X size={16} /> : <Menu size={16} />}
          onClick={() => setMobileOpen((open) => !open)}
        />
        <Tooltip title={t(collapsed ? 'nav.expand' : 'nav.collapse')}>
          <Button
            type="text"
            size="small"
            className="hidden !h-7 !w-7 !min-w-0 lg:inline-flex"
            aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
            icon={collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            onClick={() => setCollapsed((value) => !value)}
          />
        </Tooltip>
        <Tooltip title={t('common.back')}>
          <Button
            type="text"
            size="small"
            aria-label={t('common.back')}
            icon={<ArrowLeft size={16} />}
            onClick={handleBack}
            disabled={!canGoBack}
            className={cn('!h-7 !w-7 !min-w-0', !canGoBack && 'opacity-40')}
          />
        </Tooltip>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex min-w-0 max-w-[40%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 overflow-hidden px-2 sm:max-w-[45%]">
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

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden">
        {settings.showHeaderTicker && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-folio-ink/[0.08] bg-white/60 px-1.5 py-0.5 dark:border-white/[0.08] dark:bg-white/[0.03] sm:gap-3 sm:px-2">
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="hidden font-mono text-[8px] uppercase tracking-[0.14em] text-folio-ink/35 dark:text-white/30 md:inline">{t('header.netWorth')}</span>
              <span className="folio-value text-[10px] sm:text-[11px]">{isLoading ? '—' : formatINRCompact(summary.netWorth)}</span>
            </div>
            <span className="h-4 w-px bg-folio-ink/[0.08] dark:bg-white/[0.08]" />
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="hidden font-mono text-[8px] uppercase tracking-[0.14em] text-folio-ink/35 dark:text-white/30 md:inline">{t('header.liabilities')}</span>
              <span className="folio-value text-[10px] text-folio-primary dark:text-folio-accent sm:text-[11px]">{isLoading ? '—' : formatINRCompact(summary.totalLiabilities)}</span>
            </div>
          </div>
        )}
        <Badge dot={false} offset={[-2, 2]} className="shrink-0">
          <Button
            type="text"
            size="small"
            aria-label={t('header.notifications')}
            icon={<Bell size={14} />}
            className="!h-7 !w-7 !min-w-0"
          />
        </Badge>
        <Button
          type="text"
          size="small"
          aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
          icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          onClick={handleToggleTheme}
          className="!h-7 !w-7 !min-w-0 shrink-0"
        />
        <div className="ml-0.5 flex shrink-0 items-center [&_.ant-avatar]:!h-6 [&_.ant-avatar]:!w-6 [&_.ant-avatar]:!text-[9px] [&_.ant-avatar]:!leading-6">
          <UserMenu />
        </div>
      </div>
    </div>,
    titleBarSlot,
  ) : null;

  return (
    <div
      className={cn(
        'bg-folio-paper text-folio-ink dark:bg-folio-night dark:text-folio-dark-text',
        hasTitleBar ? 'h-[calc(100vh-var(--folio-titlebar-height))] overflow-hidden' : 'min-h-screen',
      )}
      style={hasTitleBar ? ({ ['--folio-titlebar-height' as string]: `${titleBarOffset}px` } as CSSProperties) : undefined}
    >
      {titleBarControls}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        summary={summary}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
        topOffset={titleBarOffset}
        showCollapseButton={!isIntegratedHeader}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label={t('nav.close')}
          className="fixed inset-x-0 bottom-0 z-40 bg-folio-ink/45 backdrop-blur-[2px] lg:hidden"
          style={{ top: titleBarOffset }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex flex-col transition-[padding] duration-200',
          hasTitleBar ? 'h-full overflow-hidden' : 'min-h-screen',
          collapsed ? 'lg:pl-[80px]' : 'lg:pl-[264px]',
        )}
      >
        {/*
        <Header
          summary={summary}
          isLoading={isLoading}
          onOpenSidebar={() => setMobileOpen(true)}
          onBack={handleBack}
          canGoBack={canGoBack}
          stickyTop={0}
        />
        */}
        {!isIntegratedHeader && (
          <Header
            summary={summary}
            isLoading={isLoading}
            onOpenSidebar={() => setMobileOpen(true)}
            onBack={handleBack}
            canGoBack={canGoBack}
            stickyTop={0}
          />
        )}

        <div className={cn('flex-1', hasTitleBar ? 'overflow-y-auto' : undefined)}>
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
