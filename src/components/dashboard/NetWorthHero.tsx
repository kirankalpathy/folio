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
  { key: 'totalInvested', label: 'dashboard.netWorth.invested' },
  { key: 'unrealisedGain', label: 'dashboard.netWorth.gain' },
];

export default function NetWorthHero({ summary, isLoading }: NetWorthHeroProps) {
  const { t } = useI18n();
  const positive = summary.unrealisedGain >= 0;
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-folio-primary/20 bg-folio-ink p-5 text-[#F7EFE9] shadow-folio-lg sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-folio-primary/20"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-folio-primary" />
            <p className="folio-label text-white/40">{t('dashboard.netWorth.label')}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
              {formatDate(dayjs().format('YYYY-MM-DD'))}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isLoading ? (
              <Skeleton.Input active size="large" className="!h-12 !w-64" />
            ) : (
              <p className="folio-value text-[2rem] leading-none sm:text-[2.75rem]">
                {formatINR(summary.netWorth)}
              </p>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10px]',
                positive
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-rose-400/20 bg-rose-400/10 text-rose-300',
              )}
            >
              <TrendIcon size={12} />
              {formatPercent(summary.returnsPercentage)}
            </span>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 xl:min-w-[520px]">
          {numberTiles.map((tile) => (
            <div key={tile.key} className="min-w-0 border-white/10 sm:border-l sm:pl-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                {t(tile.label)}
              </p>
              <p
                className={cn(
                  'folio-value mt-1.5 truncate text-sm',
                  tile.key === 'totalLiabilities' ? 'text-folio-accent' : 'text-[#F7EFE9]',
                )}
              >
                {isLoading ? '—' : formatINR(Number(summary[tile.key]))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
