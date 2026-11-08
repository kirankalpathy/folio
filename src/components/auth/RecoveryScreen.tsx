import { useState } from 'react';
import { Alert, Button } from 'antd';
import { ArrowRight, Download, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import AuthShell from './AuthShell';

function downloadRecovery(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function RecoveryScreen() {
  const { pendingRecovery, acknowledgeRecovery } = useAuth();
  const { t } = useI18n();
  const [downloaded, setDownloaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    if (!pendingRecovery) return;
    downloadRecovery(pendingRecovery.blob, pendingRecovery.fileName);
    setDownloaded(true);
  };

  const handleContinue = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await acknowledgeRecovery();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('auth.setup.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t('auth.setup.eyebrow')}
      title={t('auth.recovery.title')}
      description={t('auth.recovery.description')}
      footer={t('auth.recovery.warning')}
    >
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-folio-primary/15 bg-folio-primary/[0.05] px-3.5 py-3 dark:bg-folio-primary/10">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-folio-primary/12 text-folio-primary dark:text-folio-accent">
          <KeyRound size={17} strokeWidth={1.75} />
        </span>
        <p className="text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('auth.recovery.confirm')}</p>
      </div>

      {error && <Alert type="error" showIcon title={error} className="mb-4" />}
      {downloaded && <Alert type="success" showIcon title={t('auth.recovery.downloaded')} className="mb-4" />}

      <div className="space-y-3">
        <Button block size="large" icon={<Download size={15} />} onClick={handleDownload} disabled={!pendingRecovery}>
          {t('auth.recovery.download')}
        </Button>
        <Button
          type="primary"
          block
          size="large"
          loading={submitting}
          disabled={!downloaded}
          icon={!submitting ? <ArrowRight size={15} /> : undefined}
          iconPlacement="end"
          onClick={handleContinue}
        >
          {t('auth.recovery.continue')}
        </Button>
      </div>
    </AuthShell>
  );
}
