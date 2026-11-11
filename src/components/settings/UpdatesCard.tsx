import type { ReactNode } from 'react';
import { Alert, Button, Collapse, Progress } from 'antd';
import { CloudDownload, Download, RefreshCcw, RotateCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatDateTime } from '../../utils/date';
import { useUpdates } from '../../context/UpdateContext';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-folio-role-text">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-folio-ink/[0.06] px-1 py-0.5 font-mono text-[0.6875rem] dark:bg-white/[0.08]">{part.slice(1, -1)}</code>;
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
      blocks.push(<h4 key={`h4-${key++}`} className="mt-3 text-sm font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(4))}</h4>);
      continue;
    }
    if (t.startsWith('## ')) {
      flushList();
      blocks.push(<h3 key={`h3-${key++}`} className="mt-3 text-base font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(3))}</h3>);
      continue;
    }
    if (t.startsWith('# ')) {
      flushList();
      blocks.push(<h3 key={`h1-${key++}`} className="mt-3 text-base font-semibold text-folio-role-text first:mt-0">{renderInline(t.slice(2))}</h3>);
      continue;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      list.push(t.slice(2).trim());
      continue;
    }
    flushList();
    blocks.push(<p key={`p-${key++}`} className="leading-6">{renderInline(t)}</p>);
  }
  flushList();

  return <div className="max-h-72 overflow-auto text-sm leading-6 text-folio-ink/75 dark:text-white/70">{blocks}</div>;
}

export default function UpdatesCard() {
  const { t } = useI18n();
  const { updateState, lastCheckedAt, syncUpdates, forceUpdateSameVersion, downloadAndInstall, restartApp } = useUpdates();

  const actionButton = (() => {
    if (updateState.status === 'idle' || updateState.status === 'error') {
      return (
        <Button icon={<RefreshCcw size={14} />} onClick={() => void syncUpdates()}>
          {t('settings.about.updates.sync')}
        </Button>
      );
    }
    if (updateState.status === 'upToDate') {
      return (
        <div className="flex items-center gap-2">
          <Button icon={<RefreshCcw size={14} />} onClick={() => void syncUpdates()}>
            {t('settings.about.updates.sync')}
          </Button>
          <Button
            type="default"
            icon={<CloudDownload size={14} />}
            onClick={() => void forceUpdateSameVersion()}
            className="!border-folio-warning-border !bg-folio-warning-bg !text-folio-warning-text hover:!border-folio-warning-accent hover:!text-folio-warning-text"
          >
            {t('settings.about.updates.updateSameVersion')}
          </Button>
        </div>
      );
    }
    if (updateState.status === 'checking') {
      return (
        <Button icon={<RefreshCcw size={14} />} loading>
          {t('settings.about.updates.sync')}
        </Button>
      );
    }
    if (updateState.status === 'available') {
      return (
        <Button
          type="default"
          icon={<Download size={14} />}
          onClick={() => void downloadAndInstall()}
          className="!border-folio-warning-border !bg-folio-warning-bg !text-folio-warning-text hover:!border-folio-warning-accent hover:!text-folio-warning-text"
        >
          {t('settings.about.updates.downloadInstall')}
        </Button>
      );
    }
    if (updateState.status === 'downloading' || updateState.status === 'installing') {
      return (
        <Button
          type="default"
          icon={<Download size={14} />}
          loading
          disabled
          className="!border-folio-warning-border !bg-folio-warning-bg !text-folio-warning-text"
        >
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

  const lastChecked = lastCheckedAt
    ? t('settings.about.updates.lastChecked', { dateTime: formatDateTime(lastCheckedAt) })
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
          title={<span className="font-semibold">{t('settings.about.updates.available')}</span>}
          description={(
            <span>
              {t('settings.about.updates.availableDetailWithDate')}{' '}
              <strong>v{updateState.version}</strong>
              {updateState.date ? (
                <>
                  {' '}released on <strong>{formatDateTime(updateState.date)}</strong>
                </>
              ) : null}
              {!updateState.date ? '.' : null}
            </span>
          )}
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
