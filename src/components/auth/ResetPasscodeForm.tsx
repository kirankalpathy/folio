import { useState } from 'react';
import { Alert, Button, Form, Input, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { ArrowRight, FileKey, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { MIN_PASSCODE_LENGTH } from '../../services/auth';

interface ResetValues {
  passcode: string;
  confirmPasscode: string;
}

export default function ResetPasscodeForm({ onBack }: { onBack: () => void }) {
  const { resetPasscode } = useAuth();
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: ResetValues) => {
    if (!file) {
      setError(t('auth.reset.fileRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPasscode(file, values.passcode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('auth.reset.invalidFile'));
    } finally {
      setSubmitting(false);
    }
  };

  const fileList: UploadFile[] = file
    ? [{ uid: 'recovery', name: file.name, status: 'done' }]
    : [];

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-folio-ink dark:text-white">
        <FileKey size={16} className="text-folio-primary" />
        {t('auth.reset.title')}
      </div>
      <p className="mb-4 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('auth.reset.description')}</p>
      {error && <Alert type="error" showIcon title={error} className="mb-4" closable={{ onClose: () => setError(null) }} />}

      <Form<ResetValues> layout="vertical" requiredMark={false} onFinish={handleFinish} size="large">
        <Form.Item label={t('auth.reset.file')} required>
          <Upload
            accept=".json,application/json"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(next) => {
              setFile(next);
              setError(null);
              return false;
            }}
            onRemove={() => { setFile(null); return true; }}
          >
            <Button icon={<UploadIcon size={14} />}>{t('auth.reset.selectFile')}</Button>
          </Upload>
        </Form.Item>

        <Form.Item label={t('auth.reset.newPasscode')} name="passcode" rules={[{ required: true, message: t('validation.newPasscodeRequired') }, { min: MIN_PASSCODE_LENGTH, message: t('validation.passcodeLength') }]}>
          <Input.Password autoComplete="new-password" placeholder={t('placeholder.nextPasscode')} />
        </Form.Item>

        <Form.Item label={t('auth.reset.confirmPasscode')} name="confirmPasscode" dependencies={['passcode']} rules={[{ required: true, message: t('validation.newPasscodeConfirm') }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('passcode') === value) return Promise.resolve(); return Promise.reject(new Error(t('validation.passcodeMismatch'))); } })]}>
          <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmNextPasscode')} />
        </Form.Item>

        <div className="flex gap-2">
          <Button block onClick={onBack} disabled={submitting}>{t('common.cancel')}</Button>
          <Button type="primary" htmlType="submit" block loading={submitting} icon={!submitting ? <ArrowRight size={15} /> : undefined} iconPlacement="end">
            {t('auth.reset.submit')}
          </Button>
        </div>
      </Form>
    </>
  );
}
