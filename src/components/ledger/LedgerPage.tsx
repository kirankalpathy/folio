import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Skeleton } from 'antd';
import { Database } from 'lucide-react';
import type { AssetClassKey } from '../../types';
import { ASSET_CLASS_META } from '../../config/assetClasses';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useI18n } from '../../i18n';
import { buildLedgerRows } from '../../utils/ledger';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import LedgerStats from './LedgerStats';
import LedgerTable from './LedgerTable';

interface LedgerPageProps {
  assetClass: Exclude<AssetClassKey, 'deposits'>;
}

export default function LedgerPage({ assetClass }: LedgerPageProps) {
  const meta = ASSET_CLASS_META[assetClass];
  const { snapshot, summary, isLoading, error } = usePortfolio();
  const { t } = useI18n();
  const navigate = useNavigate();
  const rows = useMemo(
    () => buildLedgerRows(assetClass, snapshot, t),
    [assetClass, snapshot, t],
  );
  const totals = summary.categories[assetClass];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t(assetClass === 'debts' ? 'nav.group.obligations' : 'nav.group.portfolio')}
        title={t(meta.label)}
        description={t(meta.description)}
      />

      {error && <Alert type="error" showIcon title={error} />}

      <LedgerStats meta={meta} totals={totals} />

      <section className="folio-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-folio-ink/10 px-4 py-3.5 dark:border-white/[0.07]">
          <div>
            <h2 className="text-sm font-semibold">{t('ledger.positions')}</h2>
            <p className="mt-0.5 text-[11px] text-folio-ink/45 dark:text-white/40">
              {t('ledger.count', { label: t(meta.countLabel), count: totals.count })}
            </p>
          </div>
          <span className="folio-label">{t('ledger.restoredRecords')}</span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Database}
            title={t(meta.emptyTitle)}
            description={t('ledger.emptyBody')}
          >
            <Button onClick={() => navigate('/settings')}>{t('ledger.restore')}</Button>
          </EmptyState>
        ) : (
          <LedgerTable meta={meta} rows={rows} />
        )}
      </section>
    </div>
  );
}
