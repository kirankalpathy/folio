import { useState } from 'react';
import { Alert, Button, Form, Input, Switch } from 'antd';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import AuthShell from './AuthShell';
import SetupPasscodeFields from './SetupPasscodeFields';

interface SetupValues {
  firstName: string;
  lastName: string;
  email: string;
  passcodeFree?: boolean;
  passcode?: string;
  confirmPasscode?: string;
}

export default function SetupScreen() {
  const { setupAccount } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm<SetupValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passcodeFree = Form.useWatch('passcodeFree', form) ?? false;

  const handleFinish = async (values: SetupValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await setupAccount({
        firstName: values.firstName,
        lastName: values.lastName || '',
        email: values.email,
        passcodeFree: Boolean(values.passcodeFree),
        passcode: values.passcode,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('auth.setup.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow={t('auth.setup.eyebrow')} title={t('auth.setup.title')} description={t('auth.setup.description')}>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-folio-primary/15 bg-folio-primary/[0.05] px-3.5 py-3 dark:bg-folio-primary/10">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-folio-primary/12 text-folio-primary dark:text-folio-accent"><ShieldCheck size={17} /></span>
        <p className="text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('auth.setup.banner')}</p>
      </div>
      {error && <Alert type="error" showIcon title={error} className="mb-4" closable={{ onClose: () => setError(null) }} />}
      <Form<SetupValues> form={form} layout="vertical" requiredMark onFinish={handleFinish} size="large" initialValues={{ passcodeFree: false }}>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item label={t('form.firstName')} name="firstName" rules={[{ required: true, whitespace: true, message: t('validation.firstNameRequired') }]}>
            <Input autoFocus autoComplete="given-name" placeholder={t('placeholder.firstName')} />
          </Form.Item>
          <Form.Item label={t('form.lastName')} name="lastName">
            <Input autoComplete="family-name" placeholder={t('placeholder.lastName')} />
          </Form.Item>
        </div>
        <Form.Item label={t('form.email')} name="email" rules={[{ required: true, whitespace: true, message: t('validation.emailRequired') }, { type: 'email', message: t('validation.emailInvalid') }]}>
          <Input autoComplete="email" placeholder={t('placeholder.email')} />
        </Form.Item>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] font-medium text-folio-ink dark:text-folio-cream">{t('auth.setup.passcodeFree')}</span>
          <Form.Item name="passcodeFree" valuePropName="checked" noStyle>
            <Switch
              onChange={(checked) => {
                if (checked) form.setFieldsValue({ passcode: undefined, confirmPasscode: undefined });
              }}
            />
          </Form.Item>
        </div>
        {passcodeFree && <Alert type="warning" showIcon title={t('auth.setup.passcodeFreeWarningTitle')} description={t('auth.setup.passcodeFreeWarning')} className="mb-4" />}
        {!passcodeFree && <SetupPasscodeFields />}
        <Button type="primary" htmlType="submit" block loading={submitting} icon={!submitting ? <ArrowRight size={15} /> : undefined} iconPlacement="end">{t('auth.setup.submit')}</Button>
      </Form>
    </AuthShell>
  );
}
