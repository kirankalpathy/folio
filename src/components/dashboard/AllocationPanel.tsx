import { Link } from 'react-router-dom';
import type { NetWorthSummary } from '../../types';
import { ASSET_CLASS_META } from '../../config/assetClasses';
import { useI18n } from '../../i18n';
import { formatINRCompact, formatPercent } from '../../utils/finance';

export default function AllocationPanel({ summary }: { summary: NetWorthSummary }) {
  const { t } = useI18n();
  const assetSlices = summary.allocations.filter(
    (slice) => slice.kind === 'asset' && slice.value > 0,
  );
  const hasAssets = summary.totalAssets > 0;

  return (
    <section className="folio-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="folio-label">{t('dashboard.allocation.label')}</p>
          <h2 className="mt-1 text-sm font-semibold">{t('dashboard.allocation.title')}</h2>
        </div>
        <div className="text-right">
          <p className="folio-label">{t('dashboard.allocation.totalAssets')}</p>
          <p className="folio-value mt-1 text-sm">{formatINRCompact(summary.totalAssets)}</p>
        </div>
      </div>

      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-folio-ink/[0.06] dark:bg-white/[0.06]">
        {hasAssets ? (
          assetSlices.map((slice) => (
            <div
              key={slice.key}
              style={{
                width: `${slice.percentage}%`,
                backgroundColor: ASSET_CLASS_META[slice.key].color,
              }}
              title={`${t(ASSET_CLASS_META[slice.key].label)} · ${formatPercent(slice.percentage)}`}
            />
          ))
        ) : (
          <div className="w-full bg-folio-ink/[0.06] dark:bg-white/[0.06]" />
        )}
      </div>

      <ul className="mt-4 divide-y divide-folio-ink/[0.06] dark:divide-white/[0.06]">
        {summary.allocations.map((slice) => {
          const meta = ASSET_CLASS_META[slice.key];
          const isLiability = slice.kind === 'liability';

          return (
            <li key={slice.key}>
              <Link
                to={meta.path}
                className="group flex items-center gap-3 py-2.5 transition-colors hover:text-folio-primary dark:hover:text-folio-accent"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {t(meta.label)}
                </span>
                <span className="hidden font-mono text-[10px] text-folio-ink/35 dark:text-white/30 sm:inline">
                  {slice.count}
                </span>
                <span className="w-24 text-right font-mono text-xs tabular-nums">
                  {formatINRCompact(slice.value)}
                </span>
                <span
                  className={
                    isLiability
                      ? 'w-14 text-right font-mono text-[10px] text-folio-primary dark:text-folio-accent'
                      : 'w-14 text-right font-mono text-[10px] text-folio-ink/40 dark:text-white/35'
                  }
                >
                  {isLiability
                    ? t('dashboard.allocation.liability')
                    : formatPercent(slice.percentage)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-folio-ink/[0.06] pt-3 text-[11px] leading-5 text-folio-ink/40 dark:border-white/[0.06] dark:text-white/35">
        {hasAssets
          ? t('dashboard.allocation.debtShare', {
              percent: formatPercent(
                summary.totalAssets > 0
                  ? (summary.totalLiabilities / summary.totalAssets) * 100
                  : 0,
              ),
            })
          : t('dashboard.allocation.empty')}
      </p>
    </section>
  );
}
