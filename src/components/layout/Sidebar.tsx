import { Button } from 'antd';
import { PanelLeft, PanelLeftClose, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { NetWorthSummary } from '../../types';
import { NAV_GROUPS } from '../../config/navigation';
import { cn } from '../../utils/cn';
import { useI18n } from '../../i18n';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  summary: NetWorthSummary;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  summary,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-folio-ink/[0.08] bg-folio-shell transition-[width,transform] duration-200 dark:border-white/10 dark:bg-folio-dark-surface',
        'w-[280px] lg:translate-x-0',
        collapsed ? 'lg:w-[80px]' : 'lg:w-[264px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-1 px-3.5',
          collapsed ? 'lg:justify-center lg:px-2' : 'justify-end gap-2',
        )}
      >
        <Button
          type="text"
          size="small"
          className="hidden shrink-0 lg:inline-flex"
          aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          title={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          icon={collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          onClick={onToggleCollapse}
        />
        <Button
          type="text"
          size="small"
          className="lg:hidden"
          aria-label={t('nav.close')}
          icon={<X size={17} />}
          onClick={onCloseMobile}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-5 first:mt-2">
            <p
              className={cn(
                'mb-1.5 px-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-folio-ink/30 dark:text-white/25',
                collapsed && 'lg:hidden',
              )}
            >
              {t(group.label)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = item.assetClass ? summary.counts[item.assetClass] : 0;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onCloseMobile}
                      title={collapsed ? t(item.label) : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
                          collapsed && 'lg:justify-center lg:px-0',
                          isActive
                            ? 'bg-folio-primary/[0.09] text-folio-primary hover:bg-folio-primary/[0.09] hover:text-folio-primary active:bg-folio-primary/[0.12] active:text-folio-primary dark:bg-folio-primary/15 dark:text-folio-accent dark:hover:bg-folio-primary/15 dark:hover:text-folio-accent dark:active:bg-folio-primary/20 dark:active:text-folio-accent'
                            : 'text-folio-ink/60 hover:bg-folio-ink/[0.04] hover:text-folio-ink active:bg-folio-ink/[0.06] dark:text-white/50 dark:hover:bg-white/[0.05] dark:hover:text-white/80 dark:active:bg-white/[0.07]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-folio-primary dark:bg-folio-accent" />
                          )}
                          <Icon size={16} strokeWidth={isActive ? 2 : 1.7} className="shrink-0" />
                          <span className={cn('min-w-0 flex-1 truncate', collapsed && 'lg:hidden')}>
                            {t(item.label)}
                          </span>
                          {count > 0 && (
                            <span
                              className={cn(
                                'rounded-full bg-folio-ink/[0.06] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-folio-ink/45 dark:bg-white/[0.07] dark:text-white/40',
                                collapsed && 'lg:hidden',
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}
