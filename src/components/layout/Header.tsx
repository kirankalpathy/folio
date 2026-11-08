import { Badge, Button } from 'antd';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import type { NetWorthSummary } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../context/SettingsContext';
import { useI18n } from '../../i18n';
import { formatINRCompact } from '../../utils/finance';
import UserMenu from './UserMenu';

interface HeaderProps {
  summary: NetWorthSummary;
  isLoading: boolean;
  onOpenSidebar: () => void;
}

export default function Header({ summary, isLoading, onOpenSidebar }: HeaderProps) {
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    void updateSettings({ colorMode: next });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-folio-ink/[0.07] bg-white/85 backdrop-blur-md dark:border-white/[0.07] dark:bg-[#141414]/85">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Button
          type="text"
          className="lg:hidden"
          aria-label={t('nav.open')}
          icon={<Menu size={18} />}
          onClick={onOpenSidebar}
        />

        <div className="flex min-w-0 flex-1 items-center">
          <img
            src={theme === 'dark' ? '/folio-icon-inverse.svg' : '/folio-icon-color.svg'}
            alt="Folio"
            className="h-14 w-14 shrink-0"
            decoding="async"
          />
        </div>

        {settings.showHeaderTicker && (
          <div className="hidden items-center gap-4 rounded-xl border border-folio-ink/[0.08] bg-white/60 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03] md:flex">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-folio-ink/35 dark:text-white/30">
                {t('header.netWorth')}
              </p>
              <p className="folio-value text-xs">
                {isLoading ? '—' : formatINRCompact(summary.netWorth)}
              </p>
            </div>
            <span className="h-6 w-px bg-folio-ink/[0.08] dark:bg-white/[0.08]" />
            <div className="text-right">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-folio-ink/35 dark:text-white/30">
                {t('header.liabilities')}
              </p>
              <p className="folio-value text-xs text-folio-primary dark:text-folio-accent">
                {isLoading ? '—' : formatINRCompact(summary.totalLiabilities)}
              </p>
            </div>
          </div>
        )}

        <Badge dot={false} offset={[-2, 2]}>
          <Button
            type="text"
            aria-label={t('header.notifications')}
            icon={<Bell size={16} />}
          />
        </Badge>

        <Button
          type="text"
          aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
          icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          onClick={handleToggleTheme}
        />

        <UserMenu />
      </div>
    </header>
  );
}
