import { useMemo, useState } from 'react';
import { Archive, Globe, Info, Palette, RefreshCw, ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import SplitViewLayout, { type SplitViewSection } from '../components/common/SplitViewLayout';
import AppearanceCard from '../components/settings/AppearanceCard';
import BackupCard from '../components/settings/BackupCard';
import RegionalFormattingCard from '../components/settings/RegionalFormattingCard';
import ClearDataCard from '../components/settings/ClearDataCard';
import UpdatesCard from '../components/settings/UpdatesCard';
import AboutCard from '../components/settings/AboutCard';

export default function SettingsPage() {
  const { t } = useI18n();
  const [active, setActive] = useState('appearance');

  const sections = useMemo<SplitViewSection[]>(
    () => [
      { id: 'appearance', label: t('settings.appearance.title'), icon: Palette, content: <AppearanceCard /> },
      { id: 'formatting', label: t('settings.regional.title'), icon: Globe, content: <RegionalFormattingCard /> },
      { id: 'backup', label: t('settings.backup.title'), icon: Archive, content: <BackupCard /> },
      {
        id: 'danger',
        label: t('settings.danger.label'),
        icon: ShieldAlert,
        danger: true,
        dividerBefore: true,
        content: <ClearDataCard onNavigateToBackup={() => setActive('backup')} />,
      },
      { id: 'updates', label: t('settings.about.updates.title'), icon: RefreshCw, content: <UpdatesCard /> },
      { id: 'about', label: t('settings.about.title'), icon: Info, content: <AboutCard /> },
    ],
    [t],
  );

  return (
    <div className="flex min-h-full flex-col gap-5">
      <PageHeader eyebrow={t('nav.group.system')} title={t('nav.settings')} />
      <SplitViewLayout
        sections={sections}
        activeId={active}
        onActiveChange={setActive}
        ariaLabel={t('nav.settings')}
      />
    </div>
  );
}

