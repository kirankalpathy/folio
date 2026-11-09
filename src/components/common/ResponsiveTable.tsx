import type { ReactNode } from 'react';
import { Button } from 'antd';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function ResponsiveTable({
  filters,
  hasFilters,
  onClearFilters,
  title,
  count,
  actions,
  children,
  className,
  beforeFilters,
}: {
  /** Filter controls rendered inside the filters grid (inputs/selects). */
  filters: ReactNode;
  /** Whether any filter is currently applied. Controls Clear Filters button state. */
  hasFilters: boolean;
  /** Clears all filters. */
  onClearFilters: () => void;
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

  return (
    <section className={`folio-card overflow-hidden ${className ?? ''}`.trim()}>
      {beforeFilters ? (
        <div className="px-4 pt-4 sm:px-5">{beforeFilters}</div>
      ) : null}
      <div className="border-b border-folio-ink/10 p-4 dark:border-white/[0.07] sm:p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filters}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="primary"
            icon={<X size={14} />}
            disabled={!hasFilters}
            onClick={onClearFilters}
            className="w-fit"
          >
            {t('common.clearFilters')}
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-sm font-semibold">
            {title} ({count})
          </h2>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}
