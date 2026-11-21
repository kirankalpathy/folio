import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { ArrowUpDown, X } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function ResponsiveTable({
  filters,
  hasFilters,
  onClearFilters,
  sortActive,
  onClearSort,
  title,
  count,
  actions,
  children,
  className,
  beforeFilters,
}: {
  /** Filter controls rendered inside the filters grid (inputs/selects). Omit/false when search+filters are not applicable. */
  filters?: ReactNode;
  /** Whether any filter is currently applied. Controls Clear Filters button visibility. */
  hasFilters?: boolean;
  /** Clears all filters. */
  onClearFilters?: () => void;
  /** Whether any column sort is currently applied. Controls Clear Sort button visibility. */
  sortActive?: boolean;
  /** Clears all table sorting. */
  onClearSort?: () => void;
  /** Table/section title shown at the start of the table area. */
  title: string;
  /** Record count shown next to the title (filtered or total). */
  count: number;
  /** Action buttons shown at the right of the table header (e.g. export, add). */
  actions?: ReactNode;
  /** Table content. */
  children: ReactNode;
  className?: string;
  /** Optional content rendered above the filters area (e.g. tabs). */
  beforeFilters?: ReactNode;
}) {
  const { t } = useI18n();
  const showFilterSection = Boolean(filters);
  const filtersActive = showFilterSection && Boolean(hasFilters);
  const showClearSort = Boolean(sortActive && onClearSort);
  const showClearFilters = Boolean(filtersActive && onClearFilters);
  const showControls = showClearSort || showClearFilters;

  return (
    <section className={`folio-card overflow-hidden ${className ?? ''}`.trim()}>
      {beforeFilters ? (
        <div className="px-4 pt-4 sm:px-5">{beforeFilters}</div>
      ) : null}
      {showFilterSection ? (
        <div className="border-b border-folio-ink/10 p-4 dark:border-white/[0.07] sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filters}
          </div>
          {showControls ? (
            <div className="mt-3 flex justify-end gap-2">
              {showClearSort ? (
                <Button
                  icon={<ArrowUpDown size={14} />}
                  onClick={onClearSort}
                  className="w-fit"
                >
                  {t('common.clearSort')}
                </Button>
              ) : null}
              {showClearFilters ? (
                <Button
                  type="primary"
                  icon={<X size={14} />}
                  onClick={onClearFilters}
                  className="w-fit"
                >
                  {t('common.clearFilters')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-sm font-semibold">
            {title} ({count}
            {filtersActive ? (
              <Tooltip title={t('common.filteredRecordsHint')}>
                <span className="ml-0.5 cursor-help text-folio-warning-accent dark:text-folio-warning-accent" aria-label={t('common.filteredRecordsHint')}>*</span>
              </Tooltip>
            ) : null}
            )
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {!showFilterSection && showClearSort ? (
              <Button
                icon={<ArrowUpDown size={14} />}
                onClick={onClearSort}
                className="w-fit"
              >
                {t('common.clearSort')}
              </Button>
            ) : null}
            {actions}
          </div>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}
