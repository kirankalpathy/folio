import { useMemo, useState } from 'react';
import { AutoComplete, Tag } from 'antd';
import { CalendarClock, Hash, Layers, Percent, PiggyBank } from 'lucide-react';
import type { DepositHolding, DepositType } from '../../types';
import { daysUntil } from '../../utils/date';
import { getDepositLifecycleStatus, type DepositLifecycleStatus, type DepositSummary } from '../../utils/deposits';
import { formatINR, formatPercent } from '../../utils/finance';
import { useI18n } from '../../i18n';
import StatCard from '../common/StatCard';
import { DEPOSIT_STATUS_SEMANTIC, FOLIO_TAG_CLASS, semanticTagStyle } from './DepositStatusTag';
import { ACCOUNT_TYPE_FILTER_OPTIONS, accountLabel, accountTypeTagStyle } from './depositTableHelpers';

const MATURITY_WINDOWS = [10, 15, 30, 90, 180, 365];

export default function DepositStats({
  summary,
  deposits,
  onMaturingClick,
  onStatusClick,
}: {
  summary: DepositSummary;
  deposits: DepositHolding[];
  onMaturingClick?: (days: number) => void;
  onStatusClick?: (status: DepositLifecycleStatus) => void;
}) {
  const { t } = useI18n();
  const [maturityDays, setMaturityDays] = useState<number>(90);
  const [maturityInput, setMaturityInput] = useState<string>('90');
  const maturingCount = useMemo(() => {
    const asOf = new Date();
    return deposits.filter((item) => {
      if (getDepositLifecycleStatus(item) !== 'active') return false;
      const days = daysUntil(item.maturityDate, asOf);
      return Number.isFinite(days) && days >= 0 && days <= maturityDays;
    }).length;
  }, [deposits, maturityDays]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DepositLifecycleStatus, number>> = {};
    deposits.forEach((d) => {
      const s = getDepositLifecycleStatus(d);
      if (s) counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [deposits]);

  const accountTypeCounts = useMemo(() => {
    const counts: Partial<Record<DepositType, number>> = {};
    deposits.forEach((d) => {
      counts[d.accountType] = (counts[d.accountType] ?? 0) + 1;
    });
    return counts;
  }, [deposits]);

  const statusMeta: Array<{ key: DepositLifecycleStatus; label: string }> = [
    { key: 'planned', label: t('deposit.lifecycle.planned') },
    { key: 'active', label: t('deposit.lifecycle.active') },
    { key: 'in-lien', label: t('deposit.lifecycle.inLien') },
    { key: 'matured', label: t('deposit.lifecycle.matured') },
    { key: 'pre-closed', label: t('deposit.lifecycle.preClosed') },
  ];

  const commitMaturityDays = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      const clamped = Math.min(3650, Math.max(1, n));
      setMaturityDays(clamped);
      setMaturityInput(String(clamped));
    } else {
      setMaturityInput(String(maturityDays));
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label={t('deposit.stats.accountsCount', { count: summary.count })}
        icon={<Hash size={16} strokeWidth={1.6} />}
        value={
          summary.count === 0 ? (
            '0'
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {statusMeta.map(({ key, label }) => {
                const count = statusCounts[key] ?? 0;
                if (count === 0) return null;
                return (
                  <Tag
                    key={key}
                    bordered={false}
                    style={semanticTagStyle(DEPOSIT_STATUS_SEMANTIC[key])}
                    className={`!m-0 !rounded-full !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]${onStatusClick ? ' cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={onStatusClick ? () => onStatusClick(key) : undefined}
                    tabIndex={onStatusClick ? 0 : undefined}
                    role={onStatusClick ? 'button' : undefined}
                    onKeyDown={
                      onStatusClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onStatusClick(key);
                            }
                          }
                        : undefined
                    }
                    aria-label={onStatusClick ? `${label}: ${count}` : undefined}
                  >
                    {label} - {count}
                  </Tag>
                );
              })}
            </span>
          )
        }
      />
      <StatCard
        label={t('deposit.stats.accountsByCategory')}
        icon={<Layers size={16} strokeWidth={1.6} />}
        value={
          deposits.length === 0 ? (
            '0'
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {ACCOUNT_TYPE_FILTER_OPTIONS.map(({ value, labelKey }) => {
                const count = accountTypeCounts[value] ?? 0;
                if (count === 0) return null;
                const label = accountLabel(value, t);
                return (
                  <Tag
                    key={value}
                    bordered={false}
                    style={accountTypeTagStyle(value)}
                    className={FOLIO_TAG_CLASS}
                    aria-label={`${t(labelKey)}: ${count}`}
                  >
                    {label} - {count}
                  </Tag>
                );
              })}
            </span>
          )
        }
      />
      <StatCard
        label={t('deposit.stats.principal')}
        value={formatINR(summary.totalPrincipal)}
        hint={t('deposit.stats.capitalCommitted')}
        icon={<PiggyBank size={16} strokeWidth={1.6} />}
      />
      <StatCard
        label={t('deposit.stats.averageRoi')}
        value={formatPercent(summary.weightedAverageRate, 2)}
        hint={t('deposit.stats.weightedAverage')}
        icon={<Percent size={16} strokeWidth={1.6} />}
      />
      <StatCard
        label={t('deposit.stats.maturingDeposits')}
        value={String(maturingCount)}
        hint={
          <span className="flex flex-wrap items-center gap-1.5">
            <span>{t('deposit.stats.inNext')}</span>
            <AutoComplete
              size="small"
              value={maturityInput}
              options={MATURITY_WINDOWS.map((d) => ({ value: String(d), label: String(d) }))}
              onSelect={(value) => commitMaturityDays(value)}
              onChange={(value) => setMaturityInput(value)}
              onBlur={() => commitMaturityDays(maturityInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitMaturityDays(maturityInput);
                  (e.currentTarget as HTMLElement).blur();
                }
              }}
              style={{ width: 72 }}
              popupMatchSelectWidth={72}
              filterOption={(input, option) => (option?.value ?? '').toString().includes(input)}
            />
            <span>{t('deposit.stats.daysSuffix')}</span>
          </span>
        }
        tone="accent"
        icon={<CalendarClock size={16} strokeWidth={1.6} />}
        onValueClick={onMaturingClick && maturingCount > 0 ? () => onMaturingClick(maturityDays) : undefined}
        valueAriaLabel={`${t('deposit.stats.maturingDeposits')} ${t('deposit.stats.inNext')} ${maturityDays} ${t('deposit.stats.daysSuffix')}`}
      />
    </div>
  );
}
