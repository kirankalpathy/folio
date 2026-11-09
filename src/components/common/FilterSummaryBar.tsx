import type { ReactNode } from 'react';
import { Alert, Button } from 'antd';
import { X } from 'lucide-react';

export default function FilterSummaryBar({
  count,
  showClear,
  title,
  clearLabel,
  onClear,
}: {
  count: number;
  showClear: boolean;
  title: ReactNode;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <Alert
      className="folio-filter-summary-alert"
      type="info"
      showIcon={false}
      title={title}
      description={
        <span className="text-sm font-semibold text-folio-ink dark:text-[#F7EFE9]">
          {count}
        </span>
      }
      action={
        showClear ? (
          <Button
            size="small"
            type="text"
            className="folio-filter-clear-btn text-folio-info-accent hover:!bg-folio-info-accent/10 dark:hover:!bg-folio-info-accent/20"
            icon={<X size={14} />}
            onClick={onClear}
          >
            {clearLabel}
          </Button>
        ) : null
      }
    />
  );
}
