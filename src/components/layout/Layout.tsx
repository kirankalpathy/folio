import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useI18n } from '../../i18n';
import { cn } from '../../utils/cn';
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

export default function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { summary, isLoading } = usePortfolio();
  const { t } = useI18n();

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

  return (
    <div className="min-h-screen bg-folio-paper text-folio-ink dark:bg-[#141414] dark:text-[#F3F4F6]">
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
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
