import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { useToast } from '../../components/common/toast/ToastProvider';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

interface PasscodeValues {
  currentPasscode: string;
  nextPasscode: string;
  confirmPasscode: string;
}

export default function PasscodeForm() {
  const { changePasscode, passcodeProtected } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [form] = Form.useForm<PasscodeValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !passcodeProtected;

  const handleFinish = async ({ currentPasscode, nextPasscode }: PasscodeValues) => {
    setSaving(true);
    setError(null);
    try {
      await changePasscode(currentPasscode, nextPasscode);
      form.resetFields();
      toast.success(t('profile.passcode.updated'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('profile.passcode.updateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="folio-card p-4 sm:p-5">
      <p className="folio-label">{t('profile.passcode.label')}</p>
      <h2 className="mt-1 text-sm font-semibold">{t('profile.passcode.title')}</h2>
      <p className="mt-1 text-[11px] leading-5 text-folio-ink/45 dark:text-white/40">
        {disabled ? t('profile.passcode.disabledBody') : t('profile.passcode.description')}
      </p>

      {disabled && <Alert type="info" showIcon title={t('profile.passcode.disabledTitle')} className="mt-4" />}
      {error && <Alert type="error" showIcon title={error} className="mt-4" closable />}

      <Form<PasscodeValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish} className="mt-4" autoComplete="off" disabled={disabled}>
        <Form.Item label={t('form.currentPasscode')} name="currentPasscode" rules={[{ required: !disabled, message: t('validation.currentPasscodeEnter') }]}>
          <Input.Password autoComplete="current-password" placeholder={t('placeholder.currentPasscode')} />
        </Form.Item>
        <Form.Item label={t('form.newPasscode')} name="nextPasscode" rules={[{ required: !disabled, message: t('validation.newPasscodeRequired') }, { min: 6, message: t('validation.passcodeLength') }]}>
          <Input.Password autoComplete="new-password" placeholder={t('placeholder.nextPasscode')} />
        </Form.Item>
        <Form.Item label={t('form.confirmNewPasscode')} name="confirmPasscode" dependencies={['nextPasscode']} rules={[{ required: !disabled, message: t('validation.newPasscodeConfirm') }, ({ getFieldValue }) => ({ validator(_rule, value: string) { if (!value || getFieldValue('nextPasscode') === value) return Promise.resolve(); return Promise.reject(new Error(t('validation.passcodeMismatch'))); } })]}>
          <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmNextPasscode')} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} disabled={disabled} icon={!saving ? <KeyRound size={14} /> : undefined} block>
          {t('profile.passcode.submit')}
        </Button>
      </Form>
    </section>
  );
}
