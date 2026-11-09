import {
  Landmark,
  LayoutGrid,
  // QrCode, // Planned: Transact / UPI QR Generator
  Settings,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '../i18n';
import type { AssetClassKey } from '../types';
import { ASSET_CLASS_META, ASSET_CLASS_ORDER } from './assetClasses';

export interface NavItem {
  path: string;
  label: MessageKey;
  description: MessageKey;
  icon: LucideIcon;
  assetClass?: AssetClassKey;
}

export interface NavGroup {
  label: MessageKey;
  items: NavItem[];
}

const portfolioItems: NavItem[] = ASSET_CLASS_ORDER.filter(
  (key) => key !== 'debts',
).map((key) => {
  const meta = ASSET_CLASS_META[key];
  return {
    path: meta.path,
    label: meta.label,
    description: meta.description,
    icon: meta.icon,
    assetClass: key,
  };
});

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'nav.group.overview',
    items: [
      {
        path: '/',
        label: 'nav.dashboard',
        description: 'nav.dashboard.description',
        icon: LayoutGrid,
      },
    ],
  },
  {
    label: 'nav.group.accounts',
    items: [
      {
        path: '/institutions',
        label: 'nav.institutions',
        description: 'nav.institutions.description',
        icon: Landmark,
      },
    ],
  },
  {
    label: 'nav.group.portfolio',
    items: portfolioItems,
  },
  {
    label: 'nav.group.obligations',
    items: [
      {
        path: ASSET_CLASS_META.debts.path,
        label: ASSET_CLASS_META.debts.label,
        description: ASSET_CLASS_META.debts.description,
        icon: ASSET_CLASS_META.debts.icon,
        assetClass: 'debts',
      },
    ],
  },
  // Planned feature: Transact / UPI QR Generator (implementation kept in UpiTransactionPage)
  // {
  //   label: 'nav.group.transactions',
  //   items: [
  //     {
  //       path: '/transactions/upi',
  //       label: 'nav.transactions.upi',
  //       description: 'nav.transactions.upi.description',
  //       icon: QrCode,
  //     },
  //   ],
  // },
  {
    label: 'nav.group.system',
    items: [
      {
        path: '/profile',
        label: 'nav.profile',
        description: 'nav.profile.description',
        icon: UserRound,
      },
      {
        path: '/settings',
        label: 'nav.settings',
        description: 'nav.settings.description',
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function findActiveNav(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS.find((item) => item.path === '/');
  return NAV_ITEMS.find((item) => pathname.startsWith(item.path));
}
