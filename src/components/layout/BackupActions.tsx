import { useRef, useState } from 'react';
import { App as AntApp, Button } from 'antd';
import { Download, Upload } from 'lucide-react';
import { useBackup } from '../../hooks/useBackup';
import { useI18n } from '../../i18n';
import { showBackupErrorDialog, showBackupReportDialog } from '../settings/BackupReportDialog';

type PendingAction = 'export' | 'restore' | null;

export default function BackupActions() {
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
    <div className="flex items-center gap-1.5">
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
      <Button
        type="text"
        size="small"
        icon={<Upload size={15} />}
        loading={pending === 'restore'}
        disabled={pending === 'export'}
        onClick={() => inputRef.current?.click()}
        aria-label={t('backupActions.restore')}
      >
        <span className="hidden lg:inline">{t('backupActions.restoreShort')}</span>
      </Button>
      <Button
        type="text"
        size="small"
        icon={<Download size={15} />}
        loading={pending === 'export'}
        disabled={pending === 'restore'}
        onClick={() => void handleExport()}
        aria-label={t('backupActions.download')}
      >
        <span className="hidden lg:inline">{t('backupActions.downloadShort')}</span>
      </Button>
    </div>
  );
}
