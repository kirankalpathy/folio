import { ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { ASSET_CLASS_META, ASSET_CLASS_ORDER, getAllocationColor } from '../../config/assetClasses';
import type { NetWorthSummary } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useI18n } from '../../i18n';
import { formatINRCompact } from '../../utils/finance';

export default function DataOverview({ summary }: { summary: NetWorthSummary }) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();

  const setColor = (key: (typeof ASSET_CLASS_ORDER)[number], color: Color) => {
    void updateSettings({
      allocationColors: {
        ...(settings.allocationColors ?? {}),
        [key]: color.toHexString(),
      },
    });
  };

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
          const color = getAllocationColor(key, settings.allocationColors);
          return (
            <li key={key} className="flex items-center gap-3 py-2">
              <ColorPicker
                value={color}
                onChangeComplete={(c) => setColor(key, c)}
                trigger="click"
                getPopupContainer={(node) => node.parentElement ?? document.body}
              >
                <button
                  type="button"
                  className="h-2 w-2 shrink-0 rounded-full ring-offset-1 ring-offset-folio-paper transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-folio-primary/40 dark:ring-offset-folio-night"
                  style={{ backgroundColor: color }}
                  aria-label={`${t(meta.label)} color`}
                />
              </ColorPicker>
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
