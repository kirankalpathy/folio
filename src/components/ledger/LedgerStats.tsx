import type { AssetClassMeta } from '../../config/assetClasses';
import type { CategoryTotals } from '../../types';
import { useI18n } from '../../i18n';
import { formatINR, formatPercent } from '../../utils/finance';
import StatCard from '../common/StatCard';

interface LedgerStatsProps {
  meta: AssetClassMeta;
  totals: CategoryTotals;
}

export default function LedgerStats({ meta, totals }: LedgerStatsProps) {
  const { t } = useI18n();
  const isLiability = meta.key === 'debts';

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t(meta.valueLabel)} value={formatINR(totals.currentValue)} />
      <StatCard label={t(meta.costLabel)} value={formatINR(totals.investedValue)} />
      <StatCard
        label={t(meta.gainLabel)}
        value={formatINR(totals.gain, { showSign: !isLiability })}
        hint={formatPercent(totals.gainPercentage)}
        tone={isLiability || totals.gain >= 0 ? 'positive' : 'negative'}
      />
      <StatCard label={t(meta.countLabel)} value={String(totals.count)} />
    </div>
  );
}
