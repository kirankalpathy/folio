import { useCallback, useState } from 'react';
import { Alert, Button, Progress, Tag } from 'antd';
import { Download, Heart, RefreshCw, RotateCw } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import pkg from '../../../package.json';
import { useI18n } from '../../i18n';
import { INDIA_FLAG_COLORS } from '../../theme/palette';

function IndianFlagIcon({ className }: { className?: string }) {
  return (
    <svg aria-label="India" width="18" height="12" viewBox="0 0 18 12" className={className ?? 'overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/10'} xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="4" y="0" fill={INDIA_FLAG_COLORS.saffron} />
      <rect width="18" height="4" y="4" fill={INDIA_FLAG_COLORS.white} />
      <rect width="18" height="4" y="8" fill={INDIA_FLAG_COLORS.green} />
      <circle cx="9" cy="6" r="1.35" fill="none" stroke={INDIA_FLAG_COLORS.navy} strokeWidth="0.35" />
      <circle cx="9" cy="6" r="0.2" fill={INDIA_FLAG_COLORS.navy} />
    </svg>
  );
}

function IndianFlagIcon({ className }: { className?: string }) {
  return (
    <svg aria-label="India" width="18" height="12" viewBox="0 0 18 12" className={className ?? 'overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/10'} xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="4" y="0" fill={INDIA_FLAG_COLORS.saffron} />
      <rect width="18" height="4" y="4" fill={INDIA_FLAG_COLORS.white} />
      <rect width="18" height="4" y="8" fill={INDIA_FLAG_COLORS.green} />
      <circle cx="9" cy="6" r="1.35" fill="none" stroke={INDIA_FLAG_COLORS.navy} strokeWidth="0.35" />
      <circle cx="9" cy="6" r="0.2" fill={INDIA_FLAG_COLORS.navy} />
    </svg>
  );
}

export default function AboutCard() {
  const { t } = useI18n();
  const version = typeof pkg.version === 'string' ? pkg.version : '';
  const channel = typeof (pkg as { versionChannel?: string }).versionChannel === 'string'
    ? (pkg as { versionChannel?: string }).versionChannel
    : '';
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
    <section role="region" aria-labelledby="settings-about" className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <h2 id="settings-about" className="text-sm font-semibold">{t('settings.about.title')}</h2>
      </div>
      <div className="flex flex-col items-center px-4 py-6 text-center sm:px-5">
        <img src="/folio-color.svg" alt="Folio" className="h-24 w-auto dark:hidden" />
        <img src="/folio-inverse.svg" alt="Folio" className="hidden h-24 w-auto dark:block" />
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{t('settings.about.version')} {version}</span>
          {channel && <Tag color="blue" className="!m-0 !rounded-full !border-0 !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]">{channel}</Tag>}
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-folio-ink/55 dark:text-white/50">
          <span>{t('settings.about.madeWith')}</span>
          <Heart size={13} className="fill-rose-500 text-rose-500" aria-label="love" />
          <span>{t('settings.about.inIndia')}</span>
          <IndianFlagIcon />
        </p>

        <div className="mt-5 w-full max-w-sm border-t border-folio-ink/10 pt-4 text-left dark:border-white/10">
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
        <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-folio-ink/55 dark:text-white/50">
          <span>{t('settings.about.madeWith')}</span>
          <Heart size={13} className="fill-rose-500 text-rose-500" aria-label="love" />
          <span>{t('settings.about.inIndia')}</span>
          <IndianFlagIcon />
        </p>
      </div>
    </section>
  );
}
