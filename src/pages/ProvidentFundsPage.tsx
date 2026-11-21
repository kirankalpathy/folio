import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';

export default function ProvidentFundsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={t('asset.pf.label')}
        description={t('asset.pf.description')}
      />
      <section className="folio-card p-5">
        <p className="text-sm text-folio-ink/60 dark:text-white/55">Coming soon.</p>
      </section>
    </div>
  );
}
