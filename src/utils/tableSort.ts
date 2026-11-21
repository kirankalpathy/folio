import type { SorterResult } from 'antd/es/table/interface';

export function stringSorter<T>(get: (row: T) => string | undefined | null, multiple = 1) {
  return {
    compare: (a: T, b: T) => (get(a) ?? '').localeCompare(get(b) ?? '', undefined, { sensitivity: 'base' }),
    multiple,
  };
}

export function numberSorter<T>(get: (row: T) => number | undefined | null, multiple = 1) {
  return {
    compare: (a: T, b: T) => (get(a) ?? 0) - (get(b) ?? 0),
    multiple,
  };
}

export type TableSorter<T> = SorterResult<T> | SorterResult<T>[];
