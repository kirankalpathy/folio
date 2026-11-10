import { useMemo } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import SplitViewLayout, { type SplitViewSection } from '../components/common/SplitViewLayout';
import IdentityForm from '../components/profile/IdentityForm';
import PasscodeSettings from '../components/profile/PasscodeSettings';

export default function ProfilePage() {
  const { t } = useI18n();

  const sections = useMemo<SplitViewSection[]>(
    () => [
      { id: 'identity', label: t('profile.identity.title'), icon: UserRound, content: <IdentityForm /> },
      { id: 'security', label: t('profile.passcode.title'), icon: KeyRound, content: <PasscodeSettings /> },
    ],
    [t],
  );

  return (
    <div className="flex min-h-full flex-col gap-5">
      <PageHeader eyebrow={t('nav.group.system')} title={t('nav.profile')} />
      <SplitViewLayout sections={sections} defaultActiveId="identity" ariaLabel={t('nav.profile')} />
    </div>
  );
}
