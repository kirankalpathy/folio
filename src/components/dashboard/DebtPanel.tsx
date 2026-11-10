import { Link } from 'react-router-dom';
import { Progress } from 'antd';
import { ArrowRight, ReceiptText } from 'lucide-react';
import type { NetWorthSummary } from '../../types';
import { useI18n } from '../../i18n';
import { formatINR, formatPercent } from '../../utils/finance';
import { alpha, palette } from '../../theme/palette';

export default function DebtPanel({ summary }: { summary: NetWorthSummary }) {
  const { t } = useI18n();
  const debts = summary.categories.debts;
  const progress = Math.min(100, Math.max(0, debts.gainPercentage));

  return (
    <section className="folio-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="folio-label">{t('dashboard.debt.label')}</p>
          <h2 className="mt-1 text-sm font-semibold">{t('dashboard.debt.title')}</h2>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-folio-primary/20 bg-folio-primary/[0.06] text-folio-primary dark:text-folio-accent">
          <ReceiptText size={15} />
        </span>
      </div>

      <div className="mt-4">
        <p className="folio-value text-xl">{formatINR(debts.currentValue)}</p>
        <p className="mt-1 text-[11px] text-folio-ink/40 dark:text-white/35">
          {t(debts.count === 1 ? 'dashboard.debt.outstanding.one' : 'dashboard.debt.outstanding.other', {
            count: debts.count,
          })}
        </p>
      </div>

      <Progress
        percent={progress}
        showInfo={false}
        strokeColor={palette.primary}
        railColor={alpha(palette.ink, 0.08)}
        size="small"
        className="mt-4"
      />
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-folio-ink/40 dark:text-white/35">
        <span>{t('dashboard.debt.repaid', { percent: formatPercent(progress) })}</span>
        <span>
          {t('dashboard.debt.sanctioned', {
            amount: formatINR(debts.investedValue),
          })}
        </span>
      </div>

      <Link
        to="/debts"
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-folio-primary transition-colors hover:text-folio-primary-hover dark:text-folio-accent"
      >
        {t('dashboard.debt.review')} <ArrowRight size={12} />
      </Link>
    </section>
  );
}
