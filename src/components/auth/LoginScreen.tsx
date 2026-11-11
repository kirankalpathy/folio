import { useState } from 'react';
import { Alert, Avatar, Button, Form, Input } from 'antd';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { profileDisplayName } from '../../types';
import { getFirstName, getInitials } from '../../utils/profile';
import { palette } from '../../theme/palette';
import AuthShell from './AuthShell';
import ResetPasscodeForm from './ResetPasscodeForm';

interface LoginValues { passcode: string; }

export default function LoginScreen() {
  const { profile, passcodeProtected, unlock } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleUnlock = async (passcode?: string) => {
    setSubmitting(true);
    setError(null);
    try { await unlock(passcode); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t('auth.login.unlockError')); }
    finally { setSubmitting(false); }
  };

  const description = resetting
    ? t('auth.reset.description')
    : profile
      ? passcodeProtected ? t('auth.login.description', { email: profile.email }) : t('auth.login.passcodeFreeDescription')
      : t('auth.login.descriptionGeneric');

  return (
    <AuthShell
      eyebrow={t('auth.login.eyebrow')}
      title={profile ? t('auth.login.title', { name: getFirstName(profile) }) : t('auth.login.titleGeneric')}
      description={description}
      footer={passcodeProtected ? t('auth.login.footer') : undefined}
    >
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-folio-primary/15 bg-folio-primary/[0.05] px-3.5 py-3 dark:bg-folio-primary/10">
        <Avatar
          size={36}
          src={profile?.photo}
          style={
            !profile?.photo
              ? { backgroundColor: palette.primary, color: palette.avatarOnPrimary, fontWeight: 600 }
              : undefined
          }
        >
          {!profile?.photo && profile ? getInitials(profile) : <LockKeyhole size={17} />}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{profile ? profileDisplayName(profile) : t('app.localLedger')}</p>
          <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.12em] text-folio-ink/40 dark:text-white/35">
            {profile?.email ?? t('auth.login.storedOnly')}
          </p>
        </div>
      </div>

      {resetting ? (
        <ResetPasscodeForm onBack={() => { setResetting(false); setError(null); }} />
      ) : (
        <>
          {error && <Alert type="error" showIcon title={error} className="mb-4" closable={{ onClose: () => setError(null) }} />}
          {passcodeProtected ? (
            <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={({ passcode }) => void handleUnlock(passcode)} size="large">
              <Form.Item label={t('form.passcode')} name="passcode" rules={[{ required: true, message: t('validation.passcodeEnter') }]}>
                <Input.Password autoFocus autoComplete="current-password" placeholder={t('validation.passcodeEnter')} prefix={<LockKeyhole size={15} className="text-folio-ink/30 dark:text-white/30" />} />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting} icon={!submitting ? <ArrowRight size={15} /> : undefined} iconPlacement="end">{t('auth.login.submit')}</Button>
              <Button type="link" block className="mt-2" onClick={() => { setResetting(true); setError(null); }}>{t('auth.login.forgotPasscode')}</Button>
            </Form>
          ) : (
            <Button type="primary" block size="large" loading={submitting} icon={!submitting ? <ArrowRight size={15} /> : undefined} iconPlacement="end" onClick={() => void handleUnlock()}>{t('auth.login.open')}</Button>
          )}
        </>
      )}
    </AuthShell>
  );
}
