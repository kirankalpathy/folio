import { useRef, useState } from 'react';
import { App as AntApp, Button } from 'antd';
import { Archive, Download, RotateCcw } from 'lucide-react';
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
    <section className="folio-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-folio-primary/[0.08] text-folio-primary dark:bg-folio-primary/15 dark:text-folio-accent">
          <Archive size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('settings.backup.title')}</h2>
          <p className="mt-1 text-[12px] leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.backup.body')}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="primary"
            icon={<Download size={14} />}
            loading={pending === 'export'}
            disabled={pending === 'restore'}
            onClick={() => void handleExport()}
          >
            {t('settings.backup.download')}
          </Button>
          <Button
            icon={<RotateCcw size={14} />}
            loading={pending === 'restore'}
            disabled={pending === 'export'}
            onClick={() => inputRef.current?.click()}
          >
            {t('settings.backup.restore')}
          </Button>
        </div>
      </div>
    </section>
  );
}
