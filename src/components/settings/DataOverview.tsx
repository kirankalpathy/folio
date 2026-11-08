import { ASSET_CLASS_META, ASSET_CLASS_ORDER } from '../../config/assetClasses';
import type { NetWorthSummary } from '../../types';
import { useI18n } from '../../i18n';
import { formatINRCompact } from '../../utils/finance';

export default function DataOverview({ summary }: { summary: NetWorthSummary }) {
  const { t } = useI18n();

  return (
    <section className="folio-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{t('settings.storage.title')}</h2>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
          {t('settings.storage.ready')}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-folio-ink/[0.06] text-xs dark:divide-white/[0.06]">
        {ASSET_CLASS_ORDER.map((key) => {
          const meta = ASSET_CLASS_META[key];
          return (
            <li key={key} className="flex items-center gap-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              <span className="flex-1">{t(meta.label)}</span>
              <span className="font-mono text-[10px] text-folio-ink/40 dark:text-white/35">
                {summary.counts[key]}
              </span>
              <span className="w-20 text-right font-mono text-[11px] tabular-nums">
                {formatINRCompact(summary.categories[key].currentValue)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
