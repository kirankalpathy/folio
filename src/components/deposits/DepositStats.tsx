import { useMemo, useState } from 'react';
import { AutoComplete, Tag } from 'antd';
import { CalendarClock, Hash, Percent, PiggyBank } from 'lucide-react';
import type { DepositHolding } from '../../types';
import { daysUntil } from '../../utils/date';
import { getDepositLifecycleStatus, type DepositLifecycleStatus, type DepositSummary } from '../../utils/deposits';
import { formatINR, formatPercent } from '../../utils/finance';
import { useI18n } from '../../i18n';
import StatCard from '../common/StatCard';
import { DEPOSIT_STATUS_SEMANTIC, semanticTagStyle } from './DepositStatusTag';

const MATURITY_WINDOWS = [10, 15, 30, 90, 180, 365];

export default function DepositStats({
  summary,
  deposits,
}: {
  summary: DepositSummary;
  deposits: DepositHolding[];
}) {
  const { t } = useI18n();
  const [maturityDays, setMaturityDays] = useState<number>(90);
  const [maturityInput, setMaturityInput] = useState<string>('90');
  const maturingCount = useMemo(() => {
    const asOf = new Date();
    return deposits.filter((item) => {
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t('deposit.stats.accounts')}
        value={String(summary.count)}
        icon={<Hash size={16} strokeWidth={1.6} />}
        hint={
          <span className="flex flex-wrap gap-1.5">
            {statusMeta.map(({ key, label }) => {
              const count = statusCounts[key] ?? 0;
              if (count === 0) return null;
              return (
                <Tag key={key} bordered={false} style={semanticTagStyle(DEPOSIT_STATUS_SEMANTIC[key])} className="!m-0 !rounded-full !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]">
                  {label} - {count}
                </Tag>
              );
            })}
          </span>
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
        label={
          <span className="flex flex-wrap items-center gap-1.5">
            <span>{t('deposit.stats.maturingInNext')}</span>
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
        value={String(maturingCount)}
        hint={t('deposit.stats.maturingWindowHint', { days: maturityDays })}
        tone="accent"
        icon={<CalendarClock size={16} strokeWidth={1.6} />}
      />
    </div>
  );
}
