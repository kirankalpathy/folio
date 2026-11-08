import { useEffect, useState } from 'react';
import { App as AntApp, Button } from 'antd';
import { useToast } from '../../components/common/toast/ToastProvider';
import { ShieldAlert, ShieldX, Trash2 } from 'lucide-react';
import { useBackup } from '../../hooks/useBackup';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

export default function ClearDataCard() {
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
    <section
      role="region"
      aria-labelledby="settings-danger-zone"
      className="folio-card overflow-hidden !border-folio-error-border !bg-folio-error-bg"
    >
      <div className="flex items-start gap-3 border-b border-folio-error-border bg-folio-error-bg px-4 py-4">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl border border-folio-error-border bg-folio-error-bg text-folio-error-accent">
          <ShieldAlert size={17} />
        </div>
        <div>
          <h2 id="settings-danger-zone" className="text-sm font-semibold text-folio-error-text">
            {t('settings.danger.label')}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-folio-error-text/80">
            {t('settings.danger.description')}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div>
          <h3 className="text-sm font-semibold text-folio-error-text">{t('settings.danger.clearTitle')}</h3>
          <p className="mt-1.5 text-[11px] leading-5 text-folio-error-text/75">
            {t('settings.danger.clearBody')}
          </p>
          <Button
            danger
            icon={<Trash2 size={14} />}
            className="mt-4"
            onClick={handleClear}
            loading={isWorking && !deleting}
            disabled={deleting}
          >
            {t('settings.danger.clearButton')}
          </Button>
        </div>

        <div className="mt-5 border-t border-folio-error-border pt-5">
          <h3 className="text-sm font-semibold text-folio-error-text">{t('settings.danger.deleteTitle')}</h3>
          <p className="mt-1.5 text-[11px] leading-5 text-folio-error-text/75">
            {t('settings.danger.deleteBody')}
          </p>
          <Button
            danger
            type="primary"
            icon={<ShieldX size={14} />}
            className="mt-4"
            onClick={handleDelete}
            loading={deleting}
            disabled={isWorking}
          >
            {t('settings.danger.deleteButton')}
          </Button>
        </div>
      </div>
    </section>
  );
}
