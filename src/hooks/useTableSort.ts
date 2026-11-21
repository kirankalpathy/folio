import { useCallback, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';

export type SortState = Record<string, 'ascend' | 'descend' | null>;

export function useTableSort(defaultSort?: SortState) {
  const [sortState, setSortState] = useState<SortState>(defaultSort ?? {});

  const onChange: NonNullable<TableProps['onChange']> = useCallback((_pagination, _filters, sorter) => {
    const next: SortState = {};
    const arr = Array.isArray(sorter) ? sorter : [sorter];
    for (const s of arr as SorterResult<any>[]) {
      if (s?.columnKey && s.order) next[String(s.columnKey)] = s.order;
    }
    setSortState(next);
  }, []);

  const clearSort = useCallback(() => setSortState({}), []);

  const sortActive = useMemo(() => Object.values(sortState).some(Boolean), [sortState]);

  const applySort = useCallback(<T extends { key?: React.Key; dataIndex?: any; sorter?: any }>(columns: T[]): T[] => {
    return columns.map((col) => {
      const key = String(col.key ?? col.dataIndex ?? '');
      if (!col.sorter) return col;
      return { ...col, sortOrder: sortState[key] ?? null };
    });
  }, [sortState]);

  return { sortState, sortActive, onChange, clearSort, applySort };
}
