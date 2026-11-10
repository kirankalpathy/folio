import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Button, Collapse, Progress } from 'antd';
import { Download, RefreshCw, RotateCw } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { formatDateTime } from '../../utils/date';
import { useBusyIndicator } from '../common/BusyIndicator';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-folio-role-text">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-folio-ink/[0.06] px-1 py-0.5 font-mono text-[11px] dark:bg-white/[0.08]">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ReleaseNotes({ body }: { body: string }) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="ml-4 list-disc space-y-1">
        {list.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      flushList();
      continue;
    }
    if (t.startsWith('### ')) {
      flushList();
      blocks.push(<h4 key={`h4-${key++}`} className="mt-3 text-xs font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(4))}</h4>);
      continue;
    }
    if (t.startsWith('## ')) {
      flushList();
      blocks.push(<h3 key={`h3-${key++}`} className="mt-3 text-sm font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(3))}</h3>);
      continue;
    }
    if (t.startsWith('# ')) {
      flushList();
      blocks.push(<h3 key={`h1-${key++}`} className="mt-3 text-sm font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(2))}</h3>);
      continue;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      list.push(t.slice(2).trim());
      continue;
    }
    flushList();
    blocks.push(<p key={`p-${key++}`} className="leading-5">{renderInline(t)}</p>);
  }
  flushList();

  return <div className="max-h-48 overflow-auto text-xs text-folio-ink/75 dark:text-white/70">{blocks}</div>;
}

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'upToDate' }
  | { status: 'available'; version: string; body?: string; install: (onProgress: (pct: number) => void) => Promise<void> }
  | { status: 'downloading'; version: string; progress: number; body?: string }
  | { status: 'installing'; version: string; body?: string }
  | { status: 'ready'; version: string; body?: string }
  | { status: 'error'; detail: string };

export default function UpdatesCard() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { setBusyIndicator } = useBusyIndicator();
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });

  const checkForUpdates = useCallback(async () => {
    setBusyIndicator(true);
    try {
      if (!isTauri()) {
        setUpdateState({ status: 'error', detail: t('settings.about.updates.desktopOnly') });
        return;
      }
      setUpdateState({ status: 'checking' });
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        const checkedAt = new Date().toISOString();
        if (!update) {
          setUpdateState({ status: 'upToDate' });
        } else {
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
        }
        await updateSettings({ updatesLastCheckedAt: checkedAt });
      } catch (err) {
        setUpdateState({ status: 'error', detail: err instanceof Error ? err.message : String(err) });
        try {
          await updateSettings({ updatesLastCheckedAt: new Date().toISOString() });
        } catch {
          // Ignore persistence errors so the check result remains visible.
        }
      }
    } finally {
      setBusyIndicator(false);
    }
  }, [setBusyIndicator, t, updateSettings]);

  const downloadAndInstall = useCallback(async () => {
    if (updateState.status !== 'available') return;
    const { version, body, install } = updateState;
    try {
      setUpdateState({ status: 'downloading', version, progress: 0, body });
      await install((pct) => setUpdateState({ status: 'downloading', version, progress: pct, body }));
      setUpdateState({ status: 'ready', version, body });
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

  const lastChecked = settings.updatesLastCheckedAt
    ? t('settings.about.updates.lastChecked', { dateTime: formatDateTime(settings.updatesLastCheckedAt) })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="min-w-0">
          <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.about.updates.title')}</span>
          {lastChecked && (
            <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{lastChecked}</p>
          )}
        </div>
        <div className="shrink-0">{actionButton}</div>
      </div>

      {updateState.status === 'available' && (
        <Alert
          type="warning"
          showIcon
          title={t('settings.about.updates.available', { version: updateState.version })}
        />
      )}
      {updateState.status === 'downloading' && (
        <div className="min-w-[180px]">
          <div className="mb-1 text-xs text-folio-ink/60 dark:text-white/55">
            {t('settings.about.updates.downloading', { progress: String(updateState.progress) })}
          </div>
          <Progress percent={updateState.progress} size="small" className="!m-0" />
        </div>
      )}
      {updateState.status === 'installing' && (
        <div className="text-xs text-folio-ink/60 dark:text-white/55">{t('settings.about.updates.installing')}</div>
      )}
      {updateState.status === 'ready' && (
        <Alert
          type="success"
          showIcon
          title={t('settings.about.updates.downloadedReady', { version: updateState.version })}
        />
      )}
      {updateState.status === 'upToDate' && (
        <Alert type="success" showIcon title={t('settings.about.updates.upToDate')} />
      )}
      {((updateState.status === 'available' || updateState.status === 'ready') && updateState.body) && (
        <Collapse
          size="small"
          items={[
            {
              key: 'release-notes',
              label: t('settings.about.updates.changelog'),
              children: <ReleaseNotes body={updateState.body} />,
            },
          ]}
        />
      )}
      {updateState.status === 'error' && (
        <Alert type="warning" showIcon title={t('settings.about.updates.error', { detail: updateState.detail })} />
      )}
    </div>
  );
}
