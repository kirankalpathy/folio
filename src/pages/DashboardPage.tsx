import { Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../hooks/usePortfolio';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import NetWorthHero from '../components/dashboard/NetWorthHero';
import AllocationPanel from '../components/dashboard/AllocationPanel';
import DebtPanel from '../components/dashboard/DebtPanel';
import { OnboardingPanel, PrivacyPanel } from '../components/dashboard/SidePanels';
import DataOverview from '../components/settings/DataOverview';

export default function DashboardPage() {
  const { summary, isLoading, error } = usePortfolio();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.overview')}
        title={t('nav.dashboard')}
        description={t('dashboard.description')}
      />

      {error && <Alert type="error" showIcon title={error} />}

      <NetWorthHero summary={summary} isLoading={isLoading} />

      {!isLoading && summary.isEmpty ? (
        <div className="space-y-4">
          <OnboardingPanel onRestore={() => navigate('/settings')} />
          <DataOverview summary={summary} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          <AllocationPanel summary={summary} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DebtPanel summary={summary} />
            <PrivacyPanel />
          </div>
        </div>
      )}
    </div>
  );
}
