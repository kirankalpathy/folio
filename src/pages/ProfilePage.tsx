import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import IdentityForm from '../components/profile/IdentityForm';
import PasscodeSettings from '../components/profile/PasscodeSettings';

export default function ProfilePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.system')}
        title={t('nav.profile')}
        description={t('profile.description')}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <IdentityForm />
        <PasscodeSettings />
      </div>
    </div>
  );
}
