import type {
  AssetClassKey,
  BondType,
  CommodityForm,
  CompoundingFrequency,
  DebtType,
  PortfolioSnapshot,
  StockInstrument,
} from '../types';
import type { MessageKey, Translator } from '../i18n';
import { formatDate } from './date';
import { calculateReturnsPercentage, formatINR, formatPercent, formatQuantity } from './finance';

export interface LedgerRow {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  position: string;
  value: number;
  reference: number;
  detail: string;
}

const BOND_KEYS: Record<BondType, MessageKey> = {
  government: 'bondType.government',
  corporate: 'bondType.corporate',
  'tax-free': 'bondType.taxFree',
  other: 'bondType.other',
};

const INSTRUMENT_KEYS: Record<StockInstrument, MessageKey> = {
  equity: 'instrument.equity',
  etf: 'instrument.etf',
  reit: 'instrument.reit',
  invit: 'instrument.invit',
};

const COMMODITY_KEYS: Record<CommodityForm, MessageKey> = {
  physical: 'commodity.physical',
  etf: 'commodity.etf',
  sgb: 'commodity.sgb',
  digital: 'commodity.digital',
};

const DEBT_KEYS: Record<DebtType, MessageKey> = {
  'home-loan': 'debtType.homeLoan',
  'personal-loan': 'debtType.personalLoan',
  'car-loan': 'debtType.carLoan',
  'education-loan': 'debtType.educationLoan',
  'credit-card': 'debtType.creditCard',
  other: 'debtType.other',
};

const FREQUENCY_KEYS: Record<CompoundingFrequency, MessageKey> = {
  annual: 'deposit.frequency.annual',
  'semi-annual': 'deposit.frequency.semiAnnual',
  quarterly: 'deposit.frequency.quarterly',
  monthly: 'deposit.frequency.monthly',
};

export function buildLedgerRows(
  key: AssetClassKey,
  snapshot: PortfolioSnapshot,
  t: Translator,
): LedgerRow[] {
  switch (key) {
    case 'stocks':
      return snapshot.stocks.map((item) => ({
        id: item.id,
        title: item.symbol,
        subtitle: item.name,
        tag: `${item.exchange} · ${t(INSTRUMENT_KEYS[item.instrument])}`,
        position: t('ledger.shares', { quantity: formatQuantity(item.quantity) }),
        value: item.quantity * item.currentPrice,
        reference: item.quantity * item.averageCost,
        detail: `${t('ledger.average', { amount: formatINR(item.averageCost) })} · ${formatPercent(calculateReturnsPercentage(item.averageCost, item.currentPrice))}`,
      }));
    case 'bonds':
      return snapshot.bonds.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.issuer,
        tag: t(BOND_KEYS[item.bondType]),
        position: t('ledger.units', { quantity: formatQuantity(item.units) }),
        value: item.units * item.currentPrice,
        reference: item.units * item.purchasePrice,
        detail: t('ledger.coupon', {
          rate: formatPercent(item.couponRate, 2),
          date: formatDate(item.maturityDate),
        }),
      }));
    case 'pf':
      return snapshot.pfAccounts.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.institution,
        tag: item.accountType,
        position: item.accountNumberLast4
          ? t('ledger.accountHidden', { last4: item.accountNumberLast4 })
          : '—',
        value: item.currentBalance,
        reference: item.totalContributed,
        detail: t('ledger.interestSince', {
          rate: formatPercent(item.interestRate, 2),
          date: formatDate(item.openedOn),
        }),
      }));
    case 'deposits':
      return snapshot.deposits.map((item) => {
        const freq = item.cumulativeInterest === false ? item.payoutFrequency : item.compoundingFrequency;
        return {
          id: item.id,
          title: item.depositNumber ? `${item.depositNumber} · ${item.name}` : item.name,
          subtitle: item.bankName,
          tag: item.accountType.toUpperCase(),
          position: formatDate(item.maturityDate),
          value: item.currentValue,
          reference: item.principal,
          detail: `${formatPercent(item.interestRate, 2)}${freq ? ` · ${t(FREQUENCY_KEYS[freq])}` : ''}`,
        };
      });
    case 'commodities':
      return snapshot.commodities.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: t(COMMODITY_KEYS[item.form]),
        tag: item.unit,
        position: `${formatQuantity(item.quantity)} ${item.unit}`,
        value: item.quantity * item.currentPricePerUnit,
        reference: item.quantity * item.averageCostPerUnit,
        detail: t('ledger.averagePerUnit', {
          amount: formatINR(item.averageCostPerUnit, { decimals: 2 }),
          unit: item.unit,
        }),
      }));
    case 'debts':
      return snapshot.debts.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.lender,
        tag: t(DEBT_KEYS[item.debtType]),
        position: t('ledger.emi', {
          amount: formatINR(item.emiAmount),
          months: item.tenureMonths,
        }),
        value: item.outstandingPrincipal,
        reference: item.originalPrincipal,
        detail: `${formatPercent(item.interestRate, 2)} · ${
          item.nextDueDate
            ? t('ledger.nextDue', { date: formatDate(item.nextDueDate) })
            : t('ledger.sinceDate', { date: formatDate(item.startDate) })
        }`,
      }));
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}
