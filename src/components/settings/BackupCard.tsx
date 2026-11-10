import { useRef, useState } from 'react';
import { App as AntApp, Button } from 'antd';
import { Download, RotateCcw } from 'lucide-react';
import { useBackup } from '../../hooks/useBackup';
import { useI18n } from '../../i18n';
import { showBackupErrorDialog, showBackupReportDialog } from './BackupReportDialog';

type PendingAction = 'export' | 'restore' | null;

export default function BackupCard() {
  const { t } = useI18n();
  const { modal } = AntApp.useApp();
  const { exportBackup, restoreFromFile } = useBackup();
  const [pending, setPending] = useState<PendingAction>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setPending('export');
    try {
      const result = await exportBackup();
      if (result.ok) showBackupReportDialog(modal, t, result.report);
      else if (!result.cancelled) showBackupErrorDialog(modal, t, result.message);
    } finally {
      setPending(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPending('restore');
    try {
      const result = await restoreFromFile(file);
      if (result.ok) showBackupReportDialog(modal, t, result.report);
      else if (!result.cancelled) showBackupErrorDialog(modal, t, result.message);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.backup.download')}</span>
            <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('settings.backup.downloadSubtext')}</p>
          </div>
          <Button
            type="primary"
            icon={<Download size={14} />}
            loading={pending === 'export'}
            disabled={pending === 'restore'}
            onClick={() => void handleExport()}
          >
            {t('settings.backup.downloadButton')}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.backup.restore')}</span>
            <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
              {t('settings.backup.restoreSubtextBefore')}
              <strong>{t('settings.backup.restoreSubtextReplace')}</strong>
              {t('settings.backup.restoreSubtextAfter')}
            </p>
          </div>
          <Button
            icon={<RotateCcw size={14} />}
            loading={pending === 'restore'}
            disabled={pending === 'export'}
            onClick={() => inputRef.current?.click()}
          >
            {t('settings.backup.restoreButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
