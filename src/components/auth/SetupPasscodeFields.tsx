import { Form, Input } from 'antd';
import { useI18n } from '../../i18n';

export default function SetupPasscodeFields() {
  const { t } = useI18n();

  return (
    <>
      <Form.Item
        label={t('form.passcode')}
        name="passcode"
        extra={t('auth.setup.passcodeHint')}
        rules={[
          { required: true, message: t('validation.passcodeRequired') },
          { min: 6, message: t('validation.passcodeLength') },
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder={t('placeholder.newPasscode')} />
      </Form.Item>

      <Form.Item
        label={t('form.confirmPasscode')}
        name="confirmPasscode"
        dependencies={['passcode']}
        rules={[
          { required: true, message: t('validation.passcodeConfirm') },
          ({ getFieldValue }) => ({
            validator(_rule, value: string) {
              if (!value || getFieldValue('passcode') === value) return Promise.resolve();
              return Promise.reject(new Error(t('validation.passcodeMismatch')));
            },
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmPasscode')} />
      </Form.Item>
    </>
  );
}
