import { useEffect, useState } from 'react';
import { Alert, App as AntApp, Button } from 'antd';
import { useToast } from '../../components/common/toast/ToastProvider';
import { ShieldX, Trash2 } from 'lucide-react';
import { useBackup } from '../../hooks/useBackup';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

interface ClearDataCardProps {
  onNavigateToBackup?: () => void;
}

export default function ClearDataCard({ onNavigateToBackup }: ClearDataCardProps) {
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const { clearLedger, isWorking, state } = useBackup();
  const { deleteLedger } = useAuth();
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (state.phase === 'success') toast.success(state.message);
    if (state.phase === 'error') toast.error(state.message);
  }, [toast, state.message, state.phase]);

  const handleClear = () => {
    modal.confirm({
      title: t('settings.danger.clearConfirmTitle'),
      content: t('settings.danger.clearConfirmBody'),
      okText: t('settings.danger.clearConfirmOk'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await clearLedger();
      },
    });
  };

  const handleDelete = () => {
    modal.confirm({
      title: t('settings.danger.deleteConfirmTitle'),
      content: t('settings.danger.deleteConfirmBody'),
      okText: t('settings.danger.deleteConfirmOk'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeleting(true);
        try {
          await deleteLedger();
        } catch (caught) {
          toast.error(
            caught instanceof Error ? caught.message : t('settings.danger.deleteError'),
          );
          throw caught;
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <div role="region" aria-labelledby="settings-danger-zone" className="space-y-4">
      <div className="bg-folio-error-bg/50 border border-folio-error-border rounded-lg p-4 dark:bg-folio-error-bg/30 dark:border-folio-error-border/50">
        <Alert
          type="warning"
          showIcon
          title={
            <>
              {t('settings.danger.description')}
              <br />
              <strong>
                {t('settings.danger.descriptionBackupPrefix')}
                <button
                  type="button"
                  onClick={onNavigateToBackup}
                  className="rounded-sm underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folio-primary/40"
                >
                  {t('settings.danger.descriptionBackupLink')}
                </button>
                {t('settings.danger.descriptionBackupSuffix')}
              </strong>
            </>
          }
        />
        <div className="divide-y divide-folio-error-border/70 mt-3 pt-3">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <span id="settings-danger-zone" className="block text-sm font-medium text-folio-error-text">{t('settings.danger.clearTitle')}</span>
              <p className="mt-0.5 text-xs leading-5 text-folio-error-text/75">{t('settings.danger.clearBody')}</p>
            </div>
            <Button
              danger
              icon={<Trash2 size={14} />}
              onClick={handleClear}
              loading={isWorking && !deleting}
              disabled={deleting}
            >
              {t('settings.danger.clearButton')}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-folio-error-text">{t('settings.danger.deleteTitle')}</span>
              <p className="mt-0.5 text-xs leading-5 text-folio-error-text/75">{t('settings.danger.deleteBody')}</p>
            </div>
            <Button
              danger
              type="primary"
              icon={<ShieldX size={14} />}
              onClick={handleDelete}
              loading={deleting}
              disabled={isWorking}
            >
              {t('settings.danger.deleteButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
