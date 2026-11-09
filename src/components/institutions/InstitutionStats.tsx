import { useMemo } from 'react';
import { Building2, Globe } from 'lucide-react';
import type { FinancialInstitution } from '../../types';
import { useI18n } from '../../i18n';
import StatCard from '../common/StatCard';

export default function InstitutionStats({
  institutions,
}: {
  institutions: FinancialInstitution[];
}) {
  const { t } = useI18n();

  const { total, online, offline } = useMemo(() => {
    let onlineCount = 0;
    let offlineCount = 0;
    for (const fi of institutions) {
      if (fi.operationMode === 'offline') offlineCount += 1;
      else onlineCount += 1;
    }
    return { total: institutions.length, online: onlineCount, offline: offlineCount };
  }, [institutions]);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
      <StatCard
        label={t('institutions.stats.accounts')}
        value={<span className="folio-amount">{total}</span>}
        hint={t('institutions.stats.accountsCount', { count: total })}
        icon={<Building2 size={16} />}
      />
      <StatCard
        label={t('institutions.stats.operationMode')}
        value={
          <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="folio-amount">{online}</span>
            <span className="text-sm font-medium text-folio-ink/55 dark:text-white/50">{t('institutions.operation.online')}</span>
            <span className="text-folio-ink/25 dark:text-white/20" aria-hidden="true">·</span>
            <span className="folio-amount">{offline}</span>
            <span className="text-sm font-medium text-folio-ink/55 dark:text-white/50">{t('institutions.operation.offline')}</span>
          </span>
        }
        hint={t('institutions.stats.operationModeHint')}
        icon={<Globe size={16} />}
      />
    </section>
  );
}
