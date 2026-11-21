import { Factory, Layers, Palette, PieChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StockCategoryType, STOCK_CATEGORY_TYPE_LABELS } from '../types';

export interface StockCategoryTypeMeta {
  value: StockCategoryType;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  tagColor: string;
}

export const STOCK_CATEGORY_TYPE_META: Record<StockCategoryType, StockCategoryTypeMeta> = {
  [StockCategoryType.MarketCap]: {
    value: StockCategoryType.MarketCap,
    label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.MarketCap],
    icon: PieChart,
    colorClass: 'text-sky-600 dark:text-sky-400',
    tagColor: 'blue',
  },
  [StockCategoryType.Instrument]: {
    value: StockCategoryType.Instrument,
    label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Instrument],
    icon: Layers,
    colorClass: 'text-violet-600 dark:text-violet-400',
    tagColor: 'purple',
  },
  [StockCategoryType.Style]: {
    value: StockCategoryType.Style,
    label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Style],
    icon: Palette,
    colorClass: 'text-amber-600 dark:text-amber-400',
    tagColor: 'gold',
  },
  [StockCategoryType.Sector]: {
    value: StockCategoryType.Sector,
    label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Sector],
    icon: Factory,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    tagColor: 'green',
  },
};

export const STOCK_CATEGORY_TYPE_OPTIONS = Object.values(STOCK_CATEGORY_TYPE_META);
