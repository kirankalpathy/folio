import { useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal } from 'antd';
import { useToast } from '../../components/common/toast/ToastProvider';
import { Download, FileKey, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { MIN_PASSCODE_LENGTH, validateRecoveryFile, type RecoveryFileData } from '../../services/auth';

type PasscodeModal = 'set' | 'change' | 'remove' | null;
type ChangeMode = 'change' | 'forgot';

interface SetValues {
  passcode: string;
  confirmPasscode: string;
}

interface ChangeValues {
  currentPasscode: string;
  nextPasscode: string;
  confirmPasscode: string;
}

interface ResetValues {
  passcode: string;
  confirmPasscode: string;
}

interface RemoveValues {
  currentPasscode: string;
}

export default function PasscodeSettings() {
  const { passcodeProtected, enablePasscode, acknowledgeRecovery, changePasscode, disablePasscode, resetPasscode } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [modal, setModal] = useState<PasscodeModal>(null);
  const [changeMode, setChangeMode] = useState<ChangeMode>('change');
  const [resetFile, setResetFile] = useState<File | null>(null);
  const [resetFileValid, setResetFileValid] = useState(false);
  const [validatingResetFile, setValidatingResetFile] = useState(false);
  const resetFileRef = useRef<HTMLInputElement>(null);
  const activeResetFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryFile, setRecoveryFile] = useState<RecoveryFileData | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [setForm] = Form.useForm<SetValues>();
  const [changeForm] = Form.useForm<ChangeValues>();
  const [resetForm] = Form.useForm<ResetValues>();
  const [removeForm] = Form.useForm<RemoveValues>();

  const closeModal = () => {
    if (saving || confirming || validatingResetFile) return;
    activeResetFileRef.current = null;
    setModal(null);
    setChangeMode('change');
    setResetFile(null);
    setResetFileValid(false);
    setValidatingResetFile(false);
    setError(null);
    setRecoveryFile(null);
    setDownloaded(false);
    setForm.resetFields();
    changeForm.resetFields();
    resetForm.resetFields();
    removeForm.resetFields();
  };

  const openModal = (next: Exclude<PasscodeModal, null>) => {
    activeResetFileRef.current = null;
    setError(null);
    setRecoveryFile(null);
    setDownloaded(false);
    setChangeMode('change');
    setResetFile(null);
    setResetFileValid(false);
    setValidatingResetFile(false);
    setModal(next);
  };

  const handleSet = async ({ passcode }: SetValues) => {
    setSaving(true);
    setError(null);
    try {
      const file = await enablePasscode(passcode);
      setRecoveryFile(file);
      setForm.resetFields();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.passcode.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadRecovery = async () => {
    if (!recoveryFile) return;
    try {
      const path = await save({
        defaultPath: recoveryFile.fileName,
        filters: [{ name: 'Passkey', extensions: ['json'] }],
        title: t('auth.recovery.download'),
      });
      if (!path) return;
      await writeTextFile(path, await recoveryFile.blob.text());
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.passcode.updateError'));
    }
  };

  const handleConfirmRecovery = async () => {
    setConfirming(true);
    setError(null);
    try {
      await acknowledgeRecovery();
      toast.success(t('profile.passcode.enabled'));
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.passcode.updateError'));
    } finally {
      setConfirming(false);
    }
  };

  const handleChange = async ({ currentPasscode, nextPasscode }: ChangeValues) => {
    setSaving(true);
    setError(null);
    try {
      await changePasscode(currentPasscode, nextPasscode);
      toast.success(t('profile.passcode.updated'));
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.passcode.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetFileChange = (file: File | null) => {
    activeResetFileRef.current = file;
    setResetFile(file);
    setResetFileValid(false);
    setError(null);
    resetForm.resetFields();
    if (!file) return;
    setValidatingResetFile(true);
    void validateRecoveryFile(file)
      .then(() => {
        if (activeResetFileRef.current === file) setResetFileValid(true);
      })
      .catch((e) => {
        if (activeResetFileRef.current !== file) return;
        setResetFile(null);
        setResetFileValid(false);
        setError(e instanceof Error ? e.message : t('auth.reset.invalidFile'));
      })
      .finally(() => {
        if (activeResetFileRef.current === file) setValidatingResetFile(false);
      });
  };

  const handleReset = async ({ passcode }: ResetValues) => {
    if (!resetFile || !resetFileValid) {
      setError(t('auth.reset.fileRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await resetPasscode(resetFile, passcode);
      toast.success(t('auth.reset.success'));
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.reset.invalidFile'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async ({ currentPasscode }: RemoveValues) => {
    setSaving(true);
    setError(null);
    try {
      await disablePasscode(currentPasscode);
      toast.success(t('profile.passcode.removed'));
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.passcode.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const confirmMismatch = (matches: boolean, value: string) => {
    if (!value || matches) return Promise.resolve();
    return Promise.reject(new Error(t('validation.passcodeMismatch')));
  };

  return (
    <div className="space-y-4">
      {!passcodeProtected && (
        <Alert
          type="warning"
          showIcon
          title={t('profile.passcode.notSetError')}
        />
      )}

      <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
        {!passcodeProtected ? (
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('profile.passcode.title')}</span>
              <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('profile.passcode.description')}</p>
            </div>
            <Button type="primary" icon={<ShieldCheck size={14} />} onClick={() => openModal('set')}>
              {t('profile.passcode.setSubmit')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('profile.passcode.changeTitle')}</span>
                <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('profile.passcode.description')}</p>
              </div>
              <Button icon={<KeyRound size={14} />} onClick={() => openModal('change')}>
                {t('profile.passcode.changeTitle')}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <div className="min-w-0">
                <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('profile.passcode.disableAction')}</span>
                <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('profile.passcode.disableWarning')}</p>
              </div>
              <Button danger icon={<ShieldOff size={14} />} onClick={() => openModal('remove')}>
                {t('profile.passcode.disableAction')}
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        title={recoveryFile ? t('profile.passcode.recoveryTitle') : t('profile.passcode.setSubmit')}
        open={modal === 'set'}
        onCancel={recoveryFile ? undefined : closeModal}
        footer={null}
        destroyOnHidden
        centered
        maskClosable={!recoveryFile}
      >
        {error && <Alert type="error" showIcon title={error} className="mb-3" closable={{ onClose: () => setError(null) }} />}
        {!recoveryFile ? (
          <Form<SetValues> form={setForm} layout="vertical" requiredMark={false} onFinish={(v) => void handleSet(v)} autoComplete="off">
            <Form.Item label={t('form.newPasscode')} name="passcode" rules={[{ required: true, message: t('validation.newPasscodeRequired') }, { min: MIN_PASSCODE_LENGTH, message: t('validation.passcodeLength') }]}>
              <Input.Password autoComplete="new-password" placeholder={t('placeholder.nextPasscode')} />
            </Form.Item>
            <Form.Item label={t('form.confirmNewPasscode')} name="confirmPasscode" dependencies={['passcode']} rules={[{ required: true, message: t('validation.newPasscodeConfirm') }, ({ getFieldValue }) => ({ validator: (_, value: string) => confirmMismatch(getFieldValue('passcode') === value, value) })]}>
              <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmNextPasscode')} />
            </Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={closeModal}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={saving}>{t('profile.passcode.setSubmit')}</Button>
            </div>
          </Form>
        ) : (
          <div className="space-y-3">
            <p className="text-[0.8125rem] leading-5 text-folio-ink/60 dark:text-white/55">{t('profile.passcode.recoveryDescription')}</p>
            {downloaded && <Alert type="success" showIcon title={t('auth.recovery.downloaded')} />}
            <Button block icon={<Download size={14} />} onClick={() => void handleDownloadRecovery()}>
              {t('auth.recovery.download')}
            </Button>
            <Button type="primary" block disabled={!downloaded} loading={confirming} onClick={() => void handleConfirmRecovery()}>
              {t('auth.recovery.continue')}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        title={changeMode === 'forgot' ? t('auth.reset.title') : t('profile.passcode.changeTitle')}
        open={modal === 'change'}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        centered
      >
        {error && <Alert type="error" showIcon title={error} className="mb-3" closable={{ onClose: () => setError(null) }} />}
        {changeMode === 'change' ? (
          <>
            <Form<ChangeValues> form={changeForm} layout="vertical" requiredMark={false} onFinish={(v) => void handleChange(v)} autoComplete="off">
              <Form.Item label={t('form.currentPasscode')} name="currentPasscode" rules={[{ required: true, message: t('validation.currentPasscodeEnter') }]}>
                <Input.Password autoComplete="current-password" placeholder={t('placeholder.currentPasscode')} />
              </Form.Item>
              <Form.Item label={t('form.newPasscode')} name="nextPasscode" rules={[{ required: true, message: t('validation.newPasscodeRequired') }, { min: MIN_PASSCODE_LENGTH, message: t('validation.passcodeLength') }]}>
                <Input.Password autoComplete="new-password" placeholder={t('placeholder.nextPasscode')} />
              </Form.Item>
              <Form.Item label={t('form.confirmNewPasscode')} name="confirmPasscode" dependencies={['nextPasscode']} rules={[{ required: true, message: t('validation.newPasscodeConfirm') }, ({ getFieldValue }) => ({ validator: (_, value: string) => confirmMismatch(getFieldValue('nextPasscode') === value, value) })]}>
                <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmNextPasscode')} />
              </Form.Item>
              <div className="flex items-center justify-between gap-2">
                <Button type="link" className="px-0" onClick={() => { setError(null); setChangeMode('forgot'); }}>
                  {t('auth.login.forgotPasscode')}
                </Button>
                <div className="flex gap-2">
                  <Button onClick={closeModal}>{t('common.cancel')}</Button>
                  <Button type="primary" htmlType="submit" loading={saving}>{t('profile.passcode.submit')}</Button>
                </div>
              </div>
            </Form>
          </>
        ) : (
          <>
            <p className="mb-3 text-[0.8125rem] leading-5 text-folio-ink/60 dark:text-white/55">{t('auth.reset.description')}</p>
            <Form<ResetValues> form={resetForm} layout="vertical" requiredMark={false} onFinish={(v) => void handleReset(v)} autoComplete="off">
              <Form.Item label={t('auth.reset.file')} required>
                <input
                  ref={resetFileRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    handleResetFileChange(file);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button icon={<FileKey size={14} />} loading={validatingResetFile} disabled={resetFileValid} onClick={() => resetFileRef.current?.click()}>
                    {t('auth.reset.selectFile')}
                  </Button>
                  {resetFile && <span className="text-[0.75rem] text-folio-ink/55 dark:text-white/50">{resetFile.name}</span>}
                </div>
                {resetFileValid && <Alert type="success" showIcon title={t('auth.reset.fileValid')} className="mt-2" />}
              </Form.Item>
              <Form.Item label={t('auth.reset.newPasscode')} name="passcode" rules={[{ required: true, message: t('validation.newPasscodeRequired') }, { min: MIN_PASSCODE_LENGTH, message: t('validation.passcodeLength') }]}>
                <Input.Password autoComplete="new-password" placeholder={t('placeholder.nextPasscode')} disabled={!resetFileValid} />
              </Form.Item>
              <Form.Item label={t('auth.reset.confirmPasscode')} name="confirmPasscode" dependencies={['passcode']} rules={[{ required: true, message: t('validation.newPasscodeConfirm') }, ({ getFieldValue }) => ({ validator: (_, value: string) => confirmMismatch(getFieldValue('passcode') === value, value) })]}>
                <Input.Password autoComplete="new-password" placeholder={t('placeholder.confirmNextPasscode')} disabled={!resetFileValid} />
              </Form.Item>
              <div className="flex items-center justify-between gap-2">
                <Button type="link" className="px-0" onClick={() => { activeResetFileRef.current = null; setError(null); setResetFile(null); setResetFileValid(false); setValidatingResetFile(false); resetForm.resetFields(); setChangeMode('change'); }}>
                  {t('common.back')}
                </Button>
                <div className="flex gap-2">
                  <Button onClick={closeModal}>{t('common.cancel')}</Button>
                  <Button type="primary" htmlType="submit" loading={saving} disabled={!resetFileValid}>{t('auth.reset.submit')}</Button>
                </div>
              </div>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title={t('profile.passcode.disableAction')}
        open={modal === 'remove'}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        centered
      >
        {error && <Alert type="error" showIcon title={error} className="mb-3" closable={{ onClose: () => setError(null) }} />}
        <Alert type="warning" showIcon title={t('profile.passcode.disableWarning')} className="mb-3" />
        <Form<RemoveValues> form={removeForm} layout="vertical" requiredMark={false} onFinish={(v) => void handleRemove(v)} autoComplete="off">
          <Form.Item label={t('form.currentPasscode')} name="currentPasscode" rules={[{ required: true, message: t('validation.currentPasscodeEnter') }]}>
            <Input.Password autoComplete="current-password" placeholder={t('placeholder.currentPasscode')} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeModal}>{t('common.cancel')}</Button>
            <Button danger htmlType="submit" loading={saving}>{t('profile.passcode.disableAction')}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
