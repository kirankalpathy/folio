import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import AppearanceCard from '../components/settings/AppearanceCard';
import BackupCard from '../components/settings/BackupCard';
import RegionalFormattingCard from '../components/settings/RegionalFormattingCard';
import ClearDataCard from '../components/settings/ClearDataCard';
import UpdatesCard from '../components/settings/UpdatesCard';
import AboutCard from '../components/settings/AboutCard';

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.system')}
        title={t('nav.settings')}
        description={t('settings.description')}
      />

      <div className="space-y-4">
        <AppearanceCard />
        <RegionalFormattingCard />
        <BackupCard />
        <ClearDataCard />
        <UpdatesCard />
        <AboutCard />
      </div>
    </div>
  );
}
