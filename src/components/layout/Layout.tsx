import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useI18n } from '../../i18n';
import { cn } from '../../utils/cn';
import { useUnsavedChangesGuard } from '../common/UnsavedChangesGuard';
import Sidebar from './Sidebar';
import Header from './Header';

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

  return (
    <div className="min-h-screen bg-folio-paper text-folio-ink dark:bg-folio-night dark:text-folio-dark-text">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        summary={summary}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label={t('nav.close')}
          className="fixed inset-0 z-40 bg-folio-ink/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-[80px]' : 'lg:pl-[264px]',
        )}
      >
        <Header
          summary={summary}
          isLoading={isLoading}
          onOpenSidebar={() => setMobileOpen(true)}
          onBack={handleBack}
          canGoBack={canGoBack}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
