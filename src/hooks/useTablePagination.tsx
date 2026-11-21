import { useEffect, useState } from 'react';
import { AutoComplete } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useI18n } from '../i18n';

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 50, 100].map((n) => ({ value: String(n), label: String(n) }));

interface UseTablePaginationOptions {
  defaultPageSize?: number;
  resetDeps?: unknown[];
}

export function useTablePagination(options: UseTablePaginationOptions = {}): TablePaginationConfig {
  const { t } = useI18n();
  const { defaultPageSize = 10, resetDeps = [] } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pageSizeInput, setPageSizeInput] = useState(String(defaultPageSize));

  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const commitPageSize = (raw: string) => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      setPageSizeInput(String(pageSize));
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 1) {
      setPageSizeInput(String(pageSize));
      return;
    }
    const clamped = Math.min(100, n);
    setPageSize(clamped);
    setPageSizeInput(String(clamped));
    setCurrentPage(1);
  };

  return {
    current: currentPage,
    pageSize,
    showSizeChanger: false,
    align: 'center',
    showTotal: (total, range) => (
      <>
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-folio-ink/55 dark:text-white/50">
          <AutoComplete
            size="small"
            value={pageSizeInput}
            options={PAGE_SIZE_OPTIONS}
            onSelect={(value) => commitPageSize(value)}
            onChange={(value) => setPageSizeInput(value.replace(/[^\d]/g, ''))}
            onBlur={() => commitPageSize(pageSizeInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitPageSize(pageSizeInput);
                (e.currentTarget as HTMLElement).blur();
              }
            }}
            style={{ width: 64 }}
            popupMatchSelectWidth={64}
            filterOption={(input, option) => (option?.value ?? '').includes(input)}
          />
          <span>{t('common.pagination.items')}</span>
        </span>
        <span className="text-[0.75rem] text-folio-ink/55 dark:text-white/50">
          {total > 0 ? `${range[0]}-${range[1]} ${t('common.pagination.of')} ${total}` : `0 ${t('common.pagination.of')} ${total}`}
        </span>
      </>
    ),
    onChange: (page) => {
      setCurrentPage(page);
    },
  };
}
