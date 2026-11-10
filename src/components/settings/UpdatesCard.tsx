import { useCallback, useState } from 'react';
import { Alert, Button, Collapse, Progress } from 'antd';
import { Download, RefreshCw, RotateCw } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'upToDate' }
  | { status: 'available'; version: string; body?: string; install: (onProgress: (pct: number) => void) => Promise<void> }
  | { status: 'downloading'; version: string; progress: number }
  | { status: 'installing'; version: string }
  | { status: 'ready'; version: string }
  | { status: 'error'; detail: string };

export default function UpdatesCard() {
  const { t } = useI18n();
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) {
      setUpdateState({ status: 'error', detail: t('settings.about.updates.desktopOnly') });
      return;
    }
    setUpdateState({ status: 'checking' });
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        setUpdateState({ status: 'upToDate' });
        return;
      }
      setUpdateState({
        status: 'available',
        version: update.version ?? '',
        body: update.body ?? undefined,
        install: async (onProgress) => {
          let downloaded = 0;
          let contentLength = 0;
          await update.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              contentLength = event.data.contentLength ?? 0;
            } else if (event.event === 'Progress') {
              downloaded += event.data.chunkLength ?? 0;
              const pct = contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : 0;
              onProgress(pct);
            }
          });
        },
      });
    } catch (err) {
      setUpdateState({ status: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  }, [t]);

  const downloadAndInstall = useCallback(async () => {
    if (updateState.status !== 'available') return;
    const { version, install } = updateState;
    try {
      setUpdateState({ status: 'downloading', version, progress: 0 });
      await install((pct) => setUpdateState({ status: 'downloading', version, progress: pct }));
      setUpdateState({ status: 'ready', version });
    } catch (err) {
      setUpdateState({ status: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  }, [updateState]);

  const restartApp = useCallback(async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      setUpdateState({ status: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const actionButton = (() => {
    if (updateState.status === 'idle' || updateState.status === 'error' || updateState.status === 'upToDate') {
      return (
        <Button icon={<RefreshCw size={14} />} onClick={() => void checkForUpdates()}>
          {t('settings.about.updates.check')}
        </Button>
      );
    }
    if (updateState.status === 'checking') {
      return (
        <Button icon={<RefreshCw size={14} />} loading>
          {t('settings.about.updates.check')}
        </Button>
      );
    }
    if (updateState.status === 'available') {
      return (
        <Button type="primary" icon={<Download size={14} />} onClick={() => void downloadAndInstall()}>
          {t('settings.about.updates.downloadInstall')}
        </Button>
      );
    }
    if (updateState.status === 'downloading' || updateState.status === 'installing') {
      return (
        <Button type="primary" icon={<Download size={14} />} loading disabled>
          {t('settings.about.updates.downloadInstall')}
        </Button>
      );
    }
    if (updateState.status === 'ready') {
      return (
        <Button type="primary" icon={<RotateCw size={14} />} onClick={() => void restartApp()}>
          {t('settings.about.updates.restart')}
        </Button>
      );
    }
    return null;
  })();

  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <h2 className="text-sm font-semibold">{t('settings.about.updates.title')}</h2>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          {actionButton}
          {updateState.status === 'available' && (
            <Alert
              type="warning"
              showIcon
              title={t('settings.about.updates.available', { version: updateState.version })}
              className="!m-0 !flex-1 !py-1"
            />
          )}
          {updateState.status === 'downloading' && (
            <div className="min-w-[180px] flex-1">
              <div className="mb-1 text-xs text-folio-ink/60 dark:text-white/55">
                {t('settings.about.updates.downloading', { progress: String(updateState.progress) })}
              </div>
              <Progress percent={updateState.progress} size="small" className="!m-0" />
            </div>
          )}
          {updateState.status === 'installing' && (
            <span className="text-xs text-folio-ink/60 dark:text-white/55">{t('settings.about.updates.installing')}</span>
          )}
          {updateState.status === 'ready' && (
            <Alert
              type="success"
              showIcon
              title={t('settings.about.updates.downloadedReady', { version: updateState.version })}
              className="!m-0 !flex-1 !py-1"
            />
          )}
        </div>

        {updateState.status === 'upToDate' && (
          <Alert type="success" showIcon title={t('settings.about.updates.upToDate')} />
        )}

        {updateState.status === 'available' && updateState.body && (
          <Collapse
            size="small"
            items={[
              {
                key: 'release-notes',
                label: t('settings.about.updates.changelog'),
                children: <div className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-folio-ink/75 dark:text-white/70">{updateState.body}</div>,
              },
            ]}
          />
        )}

        {updateState.status === 'error' && (
          <Alert type="warning" showIcon title={t('settings.about.updates.error', { detail: updateState.detail })} />
        )}
      </div>
    </section>
  );
}
