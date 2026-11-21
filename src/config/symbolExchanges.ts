import { BarChart3, LineChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SymbolExchange } from '../types';

export interface SymbolExchangeMeta {
  value: SymbolExchange;
  label: string;
  icon?: LucideIcon;
  colorClass?: string;
  tagColor?: string;
}

export const SYMBOL_EXCHANGE_META: Record<SymbolExchange, SymbolExchangeMeta> = {
  [SymbolExchange.NSE]: {
    value: SymbolExchange.NSE,
    label: 'NSE',
    icon: LineChart,
    colorClass: 'text-blue-600 dark:text-blue-400',
    tagColor: 'blue',
  },
  [SymbolExchange.BSE]: {
    value: SymbolExchange.BSE,
    label: 'BSE',
    icon: BarChart3,
    colorClass: 'text-orange-600 dark:text-orange-400',
    tagColor: 'orange',
  },
};

export const SYMBOL_EXCHANGE_OPTIONS = Object.values(SYMBOL_EXCHANGE_META);
