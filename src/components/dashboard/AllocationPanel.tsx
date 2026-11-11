import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { CornerDownRight } from 'lucide-react';
import type { AllocationKey, NetWorthSummary } from '../../types';
import { ASSET_CLASS_META, getAllocationColor, getAllocationMeta } from '../../config/assetClasses';
import { useSettings } from '../../context/SettingsContext';
import { useI18n } from '../../i18n';
import { formatINRCompact, formatPercent } from '../../utils/finance';
import { alpha } from '../../theme/palette';

export default function AllocationPanel({ summary }: { summary: NetWorthSummary }) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const hasWealth = (value: number) => value > 0;
  const [selectedKey, setSelectedKey] = useState<AllocationKey | null>(null);
  const [hoveredKey, setHoveredKey] = useState<AllocationKey | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedKey) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setSelectedKey(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [selectedKey]);

  const setColor = (key: AllocationKey, color: Color) => {
    const hex = color.toHexString();
    void updateSettings({
      allocationColors: {
        ...(settings.allocationColors ?? {}),
        [key]: hex,
      },
    });
  };

  const colorOf = (key: AllocationKey) => getAllocationColor(key, settings.allocationColors);

  const depositChildren = summary.allocations.filter(
    (s) => String(s.key).startsWith('deposits-') && hasWealth(s.value),
  );
  const depositParent = depositChildren.length > 0 ? {
    value: depositChildren.reduce((sum, s) => sum + s.value, 0),
    count: depositChildren.reduce((sum, s) => sum + s.count, 0),
    percentage: depositChildren.reduce((sum, s) => sum + s.percentage, 0),
  } : null;

  const nonDepositAllocations = summary.allocations.filter(
    (s) => !String(s.key).startsWith('deposits-') && hasWealth(s.value),
  );
  const assetSlices = summary.allocations.filter((s) => s.kind === 'asset' && hasWealth(s.value));
  const hasAssets = summary.totalAssets > 0;

  const renderColorDot = (key: AllocationKey, size: 'sm' | 'md') => {
    const cls = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
    return (
      <ColorPicker
        value={colorOf(key)}
        onChangeComplete={(c) => setColor(key, c)}
        trigger="click"
        destroyOnHidden={false}
        getPopupContainer={(node) => node.parentElement ?? document.body}
      >
        <button
          type="button"
          className={`${cls} shrink-0 rounded-full ring-offset-1 ring-offset-folio-paper transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-folio-primary/40 dark:ring-offset-folio-night`}
          style={{ backgroundColor: colorOf(key) }}
          aria-label={`${t(getAllocationMeta(key).label)} color`}
          onClick={(e) => e.stopPropagation()}
        />
      </ColorPicker>
    );
  };

  return (
    <section className="folio-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="folio-label">{t('dashboard.allocation.label')}</p>
          <h2 className="mt-1 text-sm font-semibold text-folio-role-text">{t('dashboard.allocation.title')}</h2>
        </div>
        <div className="text-right">
          <p className="folio-label">{t('dashboard.allocation.totalAssets')}</p>
          <p className="folio-value mt-1 text-sm">{formatINRCompact(summary.totalAssets)}</p>
        </div>
      </div>

      <div ref={barRef} className="relative mt-5 pb-1">
        <div className="relative h-3">
          <div className="pointer-events-none absolute inset-0 rounded-full bg-folio-ink/[0.06] dark:bg-white/[0.06]" />
          <div className="relative flex h-full items-stretch rounded-full">
            {hasAssets && assetSlices.length > 0 ? (
              assetSlices.map((slice, idx) => {
                const meta = getAllocationMeta(slice.key);
                const color = colorOf(slice.key);
                const isSelected = selectedKey === slice.key;
                const isHovered = hoveredKey === slice.key;
                const showTip = isSelected || isHovered;
                const isFirst = idx === 0;
                const isLast = idx === assetSlices.length - 1;
                const shadowColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color) ? alpha(color, 0.28) : 'rgba(0,0,0,0.14)';
                return (
                  <div
                    key={slice.key}
                    className="group relative h-full"
                    style={{ width: `${slice.percentage}%`, minWidth: slice.percentage > 0 ? 6 : 0 }}
                  >
                    {showTip && (
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-folio-ink px-2 py-0.5 font-mono text-[0.625rem] text-folio-cream shadow-lg dark:bg-folio-shell dark:text-folio-ink">
                        {t(meta.label)} • {formatPercent(slice.percentage)}
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-folio-ink dark:border-t-folio-shell" />
                      </div>
                    )}
                    <button
                      type="button"
                      className="block h-full w-full transition-all duration-150 focus:outline-none"
                      style={{
                        backgroundColor: color,
                        borderTopLeftRadius: isFirst ? 9999 : 0,
                        borderBottomLeftRadius: isFirst ? 9999 : 0,
                        borderTopRightRadius: isLast ? 9999 : 0,
                        borderBottomRightRadius: isLast ? 9999 : 0,
                        transform: isSelected ? 'translateY(-1px)' : isHovered ? 'translateY(-1px)' : undefined,
                        boxShadow: isSelected ? `0 1px 4px ${shadowColor}, 0 0 0 1px ${shadowColor}` : undefined,
                        position: 'relative',
                        zIndex: isSelected ? 20 : isHovered ? 10 : 1,
                      }}
                      aria-label={`${t(meta.label)} ${formatPercent(slice.percentage)}`}
                      title={`${t(meta.label)} · ${formatPercent(slice.percentage)}`}
                      onMouseEnter={() => setHoveredKey(slice.key)}
                      onMouseLeave={() => setHoveredKey((k) => (k === slice.key ? null : k))}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKey((k) => (k === slice.key ? null : slice.key));
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="h-full w-full rounded-full" />
            )}
          </div>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-folio-ink/[0.06] dark:divide-white/[0.06]">
        {nonDepositAllocations.map((slice) => {
          const meta = getAllocationMeta(slice.key);
          const isLiability = slice.kind === 'liability';
          return (
            <li key={slice.key}>
              <div className="group flex items-center gap-3 py-2.5 transition-colors">
                {renderColorDot(slice.key, 'sm')}
                <Link
                  to={meta.path}
                  className="min-w-0 flex-1 truncate text-xs font-medium text-folio-role-text hover:text-folio-primary dark:hover:text-folio-accent"
                >
                  {t(meta.label)}
                </Link>
                <span className="hidden font-mono text-[0.625rem] text-folio-ink/35 dark:text-white/30 sm:inline">{slice.count}</span>
                <span className="w-24 text-right font-mono text-xs tabular-nums">{formatINRCompact(slice.value)}</span>
                <span className={isLiability ? 'w-14 text-right font-mono text-[0.625rem] text-folio-primary dark:text-folio-accent' : 'w-14 text-right font-mono text-[0.625rem] text-folio-ink/40 dark:text-white/35'}>
                  {isLiability ? t('dashboard.allocation.liability') : formatPercent(slice.percentage)}
                </span>
              </div>
            </li>
          );
        })}

        {depositParent ? (
          <li key="deposits-group">
            <div className="group flex items-center gap-3 py-2.5 transition-colors">
              {renderColorDot('deposits', 'sm')}
              <Link
                to={ASSET_CLASS_META.deposits.path}
                className="min-w-0 flex-1 truncate text-xs font-semibold text-folio-role-text hover:text-folio-primary dark:hover:text-folio-accent"
              >
                {t(ASSET_CLASS_META.deposits.label)}
              </Link>
              <span className="hidden font-mono text-[0.625rem] text-folio-ink/35 dark:text-white/30 sm:inline">{depositParent.count}</span>
              <span className="w-24 text-right font-mono text-xs tabular-nums">{formatINRCompact(depositParent.value)}</span>
              <span className="w-14 text-right font-mono text-[0.625rem] text-folio-ink/40 dark:text-white/35">{formatPercent(depositParent.percentage)}</span>
            </div>
            <ul className="pb-1">
              {depositChildren.map((slice) => {
                const meta = getAllocationMeta(slice.key);
                return (
                  <li key={slice.key}>
                    <div className="flex items-center gap-2 py-1.5 pl-4 pr-0 sm:pl-5">
                      <CornerDownRight size={12} className="shrink-0 text-folio-ink/30 dark:text-white/25" />
                      {renderColorDot(slice.key, 'sm')}
                      <span className="min-w-0 flex-1 truncate text-[0.6875rem] font-medium text-folio-ink/80 dark:text-white/75">{t(meta.label)}</span>
                      <span className="hidden font-mono text-[0.625rem] text-folio-ink/35 dark:text-white/30 sm:inline">{slice.count}</span>
                      <span className="w-24 text-right font-mono text-[0.6875rem] tabular-nums text-folio-ink dark:text-folio-dark-text">{formatINRCompact(slice.value)}</span>
                      <span className="w-14 text-right font-mono text-[0.625rem] text-folio-ink/40 dark:text-white/35">{formatPercent(slice.percentage)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ) : null}
      </ul>

      <p className="mt-3 border-t border-folio-ink/[0.06] pt-3 text-[0.6875rem] leading-5 text-folio-ink/40 dark:border-white/[0.06] dark:text-white/35">
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
