import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { useToast } from '../../components/common/toast/ToastProvider';
import { Download, Upload } from 'lucide-react';
import { useBackup } from '../../hooks/useBackup';
import { useI18n } from '../../i18n';

type PendingAction = 'export' | 'restore' | null;

export default function BackupActions() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { state, exportBackup, restoreFromFile } = useBackup();
  const [pending, setPending] = useState<PendingAction>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.phase === 'success') toast.success(state.message);
    if (state.phase === 'error') toast.error(state.message);
  }, [toast, state.message, state.phase]);

  const handleExport = async () => {
    setPending('export');
    try {
      await exportBackup();
    } finally {
      setPending(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPending('restore');
    try {
      await restoreFromFile(file);
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
