import { useCallback, useState } from 'react';
import { Alert, Button, Progress } from 'antd';
import { Download, RefreshCw, RotateCw } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import pkg from '../../../package.json';
import { useI18n } from '../../i18n';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'upToDate' }
  | { status: 'available'; version: string; body?: string; install: (onProgress: (pct: number) => void) => Promise<void> }
  | { status: 'downloading'; progress: number }
  | { status: 'installing' }
  | { status: 'ready' }
  | { status: 'error'; detail: string };

export default function AboutCard() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const version = typeof pkg.version === 'string' ? pkg.version : '';
  const channel = typeof (pkg as { versionChannel?: string }).versionChannel === 'string'
    ? (pkg as { versionChannel?: string }).versionChannel
    : 'Desktop';
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
    try {
      setUpdateState({ status: 'downloading', progress: 0 });
      await updateState.install((pct) => setUpdateState({ status: 'downloading', progress: pct }));
      setUpdateState({ status: 'ready' });
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

  return (
    <section className="folio-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">{t('settings.about.title')}</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <img src="/folio-icon-color.svg" alt="Folio icon" className="h-11 w-11 shrink-0" loading="lazy" />
            <div className="min-w-0">
              <img src="/folio-text-mark.svg" alt="Folio" className="h-5 w-auto dark:hidden" loading="lazy" />
              <img src="/folio-text-mark-inverse.svg" alt="Folio" className="hidden h-5 w-auto dark:block" loading="lazy" />
              <p className="mt-1 text-[11px] text-folio-ink/45 dark:text-white/40">{channel}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-folio-ink/[0.05] px-2.5 py-1 font-mono text-[10px] text-folio-ink/55 dark:bg-white/[0.06] dark:text-white/45">
              {t('settings.about.version')} {version}
            </span>
          </div>
          <p className="text-[11px] leading-5 text-folio-ink/45 dark:text-white/40">
            {t('settings.about.madeWith')} ♥ {t('settings.about.inIndia')} {year}.
          </p>
        </div>
      </div>

      <div className="border-t border-folio-ink/10 pt-4 dark:border-white/10">
        <h3 className="text-[13px] font-semibold text-folio-ink dark:text-folio-dark-text">{t('settings.about.updates.title')}</h3>
        <div className="mt-3 space-y-3">
          {(updateState.status === 'idle' || updateState.status === 'upToDate' || updateState.status === 'error') && (
            <Button icon={<RefreshCw size={14} />} onClick={() => void checkForUpdates()}>
              {t('settings.about.updates.check')}
            </Button>
          )}
          {updateState.status === 'checking' && <Button icon={<RefreshCw size={14} />} loading>{t('settings.about.updates.checking')}</Button>}
          {updateState.status === 'upToDate' && <Alert type="success" showIcon title={t('settings.about.updates.upToDate')} />}
          {updateState.status === 'available' && (
            <div className="space-y-2">
              <Alert type="info" showIcon title={t('settings.about.updates.available', { version: updateState.version })} description={updateState.body ? <div className="max-h-32 overflow-auto whitespace-pre-wrap text-xs">{updateState.body}</div> : undefined} />
              <Button type="primary" icon={<Download size={14} />} onClick={() => void downloadAndInstall()}>
                {t('settings.about.updates.downloadInstall')}
              </Button>
            </div>
          )}
          {updateState.status === 'downloading' && (
            <div className="space-y-1">
              <p className="text-xs text-folio-ink/55 dark:text-white/50">{t('settings.about.updates.downloading', { progress: String(updateState.progress) })}</p>
              <Progress percent={updateState.progress} size="small" />
            </div>
          )}
          {updateState.status === 'installing' && <p className="text-xs text-folio-ink/55 dark:text-white/50">{t('settings.about.updates.installing')}</p>}
          {updateState.status === 'ready' && (
            <div className="space-y-2">
              <Alert type="success" showIcon title={t('settings.about.updates.restartHint')} />
              <Button type="primary" icon={<RotateCw size={14} />} onClick={() => void restartApp()}>
                {t('settings.about.updates.restart')}
              </Button>
            </div>
          )}
          {updateState.status === 'error' && (
            <Alert type="warning" showIcon title={t('settings.about.updates.error', { detail: updateState.detail })} />
          )}
        </div>
      </div>
    </section>
  );
}
