import {
  BadgePercent,
  Gem,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  CandlestickChart,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '../i18n';
import type { AllocationKey, AssetClassKey } from '../types';
import { palette } from '../theme/palette';

export interface AssetClassMeta {
  key: AssetClassKey;
  label: MessageKey;
  shortLabel: MessageKey;
  path: string;
  description: MessageKey;
  icon: LucideIcon;
  color: string;
  valueLabel: MessageKey;
  costLabel: MessageKey;
  gainLabel: MessageKey;
  countLabel: MessageKey;
  emptyTitle: MessageKey;
}

export const ASSET_CLASS_META: Record<AssetClassKey, AssetClassMeta> = {
  stocks: {
    key: 'stocks',
    label: 'asset.stocks.label',
    shortLabel: 'asset.stocks.shortLabel',
    path: '/stocks',
    description: 'asset.stocks.description',
    icon: CandlestickChart,
    color: palette.asset.stocks,
    valueLabel: 'asset.stocks.valueLabel',
    costLabel: 'asset.stocks.costLabel',
    gainLabel: 'asset.stocks.gainLabel',
    countLabel: 'asset.stocks.countLabel',
    emptyTitle: 'asset.stocks.emptyTitle',
  },
  bonds: {
    key: 'bonds',
    label: 'asset.bonds.label',
    shortLabel: 'asset.bonds.shortLabel',
    path: '/bonds',
    description: 'asset.bonds.description',
    icon: BadgePercent,
    color: palette.asset.bonds,
    valueLabel: 'asset.bonds.valueLabel',
    costLabel: 'asset.bonds.costLabel',
    gainLabel: 'asset.bonds.gainLabel',
    countLabel: 'asset.bonds.countLabel',
    emptyTitle: 'asset.bonds.emptyTitle',
  },
  pf: {
    key: 'pf',
    label: 'asset.pf.label',
    shortLabel: 'asset.pf.shortLabel',
    path: '/pf',
    description: 'asset.pf.description',
    icon: ShieldCheck,
    color: palette.asset.pf,
    valueLabel: 'asset.pf.valueLabel',
    costLabel: 'asset.pf.costLabel',
    gainLabel: 'asset.pf.gainLabel',
    countLabel: 'asset.pf.countLabel',
    emptyTitle: 'asset.pf.emptyTitle',
  },
  deposits: {
    key: 'deposits',
    label: 'asset.deposits.label',
    shortLabel: 'asset.deposits.shortLabel',
    path: '/deposits',
    description: 'asset.deposits.description',
    icon: PiggyBank,
    color: palette.asset.deposits,
    valueLabel: 'asset.deposits.valueLabel',
    costLabel: 'asset.deposits.costLabel',
    gainLabel: 'asset.deposits.gainLabel',
    countLabel: 'asset.deposits.countLabel',
    emptyTitle: 'asset.deposits.emptyTitle',
  },
  commodities: {
    key: 'commodities',
    label: 'asset.commodities.label',
    shortLabel: 'asset.commodities.shortLabel',
    path: '/assets',
    description: 'asset.commodities.description',
    icon: Gem,
    color: palette.asset.commodities,
    valueLabel: 'asset.commodities.valueLabel',
    costLabel: 'asset.commodities.costLabel',
    gainLabel: 'asset.commodities.gainLabel',
    countLabel: 'asset.commodities.countLabel',
    emptyTitle: 'asset.commodities.emptyTitle',
  },
  debts: {
    key: 'debts',
    label: 'asset.debts.label',
    shortLabel: 'asset.debts.shortLabel',
    path: '/debts',
    description: 'asset.debts.description',
    icon: ReceiptText,
    color: palette.asset.debts,
    valueLabel: 'asset.debts.valueLabel',
    costLabel: 'asset.debts.costLabel',
    gainLabel: 'asset.debts.gainLabel',
    countLabel: 'asset.debts.countLabel',
    emptyTitle: 'asset.debts.emptyTitle',
  },
};

export const ASSET_CLASS_ORDER: AssetClassKey[] = [
  'stocks',
  'bonds',
  'pf',
  'deposits',
  'commodities',
  'debts',
];

export const ASSET_CLASSES: AssetClassMeta[] = ASSET_CLASS_ORDER.map(
  (key) => ASSET_CLASS_META[key],
);


export interface AllocationMeta {
  label: MessageKey;
  path: string;
  color: string;
}

export function getAllocationMeta(key: AllocationKey): AllocationMeta {
  if (key === 'deposits-fd') return { label: 'asset.deposits.fd', path: '/deposits', color: palette.asset.depositsFd };
  if (key === 'deposits-rd') return { label: 'asset.deposits.rd', path: '/deposits', color: palette.asset.depositsRd };
  if (key === 'deposits-other') return { label: 'asset.deposits.other', path: '/deposits', color: palette.asset.depositsOther };
  const meta = ASSET_CLASS_META[key as AssetClassKey];
  return { label: meta.label, path: meta.path, color: meta.color };
}
