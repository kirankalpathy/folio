import { Skeleton } from 'antd';
import dayjs from 'dayjs';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { NetWorthSummary } from '../../types';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/date';
import { formatINR, formatPercent } from '../../utils/finance';

interface NetWorthHeroProps {
  summary: NetWorthSummary;
  isLoading: boolean;
}

const numberTiles: Array<{ key: keyof NetWorthSummary; label: MessageKey }> = [
  { key: 'totalAssets', label: 'dashboard.netWorth.assets' },
  { key: 'totalLiabilities', label: 'dashboard.netWorth.liabilities' },
  { key: 'realizedGain', label: 'dashboard.netWorth.realizedGain' },
  { key: 'unrealisedGain', label: 'dashboard.netWorth.unrealizedGain' },
  { key: 'totalGain', label: 'dashboard.netWorth.totalGain' },
];

export default function NetWorthHero({ summary, isLoading }: NetWorthHeroProps) {
  const { t } = useI18n();
  const positive = (summary.realizedGain + summary.unrealisedGain) >= 0;
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-folio-primary/20 bg-folio-ink p-5 text-folio-cream shadow-folio-lg dark:border-folio-primary/25 dark:bg-folio-cream dark:text-folio-ink sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-folio-primary/20 dark:border-folio-primary/25"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-folio-primary" />
            <p className="folio-label !text-folio-cream/50 dark:!text-folio-ink/50">{t('dashboard.netWorth.label')}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-folio-cream/50 dark:border-folio-ink/10 dark:bg-folio-ink/[0.04] dark:text-folio-ink/50">
              {formatDate(dayjs().format('YYYY-MM-DD'))}
            </span>
          </div>

          <div className="mt-2">
            {isLoading ? (
              <Skeleton.Input active size="large" className="!h-12 !w-64" />
            ) : (
              <p className="folio-value text-[2rem] leading-none text-folio-cream dark:text-folio-ink sm:text-[2.75rem]">
                {formatINR(summary.netWorth)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-4 xl:flex-nowrap xl:gap-x-4">
          {numberTiles.map((tile, index) => (
            <div key={tile.key} className={cn('shrink-0 border-white/10 dark:border-folio-ink/10', index > 0 && 'xl:border-l xl:pl-4')}>
              <p className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-folio-cream/45 dark:text-folio-ink/45">
                {t(tile.label)}
              </p>
              {tile.key === 'totalGain' ? (
                <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                  <p className={cn('folio-value truncate text-sm', positive ? 'text-emerald-300 dark:text-emerald-700' : 'text-rose-300 dark:text-rose-700')}>
                    {isLoading ? '—' : formatINR(summary.totalGain)}
                  </p>
                  {!isLoading && (
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-mono text-[0.625rem] leading-none',
                        positive
                          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300 dark:border-emerald-600/25 dark:bg-emerald-500/10 dark:text-emerald-700'
                          : 'border-rose-400/25 bg-rose-400/10 text-rose-300 dark:border-rose-600/25 dark:bg-rose-500/10 dark:text-rose-700',
                      )}
                    >
                      <TrendIcon size={11} />
                      {formatPercent(summary.returnsPercentage)}
                    </span>
                  )}
                </div>
              ) : (
                <p
                  className={cn(
                    'folio-value mt-1.5 truncate text-sm',
                    tile.key === 'totalLiabilities'
                      ? 'text-folio-accent dark:text-folio-primary'
                      : tile.key === 'realizedGain'
                        ? 'text-folio-info-accent'
                        : tile.key === 'unrealisedGain'
                          ? 'text-folio-success-accent'
                          : 'text-folio-cream dark:text-folio-ink',
                  )}
                >
                  {isLoading ? '—' : formatINR(Number(summary[tile.key]))}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
