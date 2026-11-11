import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { translate } from '../i18n';
import { useToast } from '../components/common/toast/ToastProvider';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'upToDate' }
  | { status: 'available'; version: string; date?: string; body?: string; install: (onProgress: (pct: number) => void) => Promise<void> }
  | { status: 'downloading'; version: string; progress: number; date?: string; body?: string }
  | { status: 'installing'; version: string; date?: string; body?: string }
  | { status: 'ready'; version: string; date?: string; body?: string }
  | { status: 'error'; detail: string };

export interface UpdateEvent {
  type: 'available' | 'downloaded' | 'error' | 'upToDate';
  version?: string;
  message?: string;
}

interface UpdateCache {
  lastCheckedAt?: string;
  status?: 'upToDate' | 'available' | 'error';
  version?: string;
  date?: string;
  body?: string;
}

const UPDATE_CACHE_KEY = 'folio:updateCache';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h, configurable in future

function readCache(): UpdateCache {
  try {
    const raw = localStorage.getItem(UPDATE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UpdateCache;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

interface UpdateContextValue {
  updateState: UpdateState;
  lastCheckedAt?: string;
  syncUpdates: (opts?: { silent?: boolean }) => Promise<void>;
  forceUpdateSameVersion: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restartApp: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [lastCheckedAt, setLastCheckedAt] = useState<string | undefined>(() => readCache().lastCheckedAt);
  const checkingRef = useRef(false);
  const downloadingRef = useRef(false);
  const listenersRef = useRef<Array<(e: UpdateEvent) => void>>([]);
  // reserved for future notification framework integration
  void listenersRef;

  const persistCheck = useCallback((checkedAt: string, cachePatch: Partial<UpdateCache>) => {
    setLastCheckedAt(checkedAt);
    writeCache({ ...readCache(), lastCheckedAt: checkedAt, ...cachePatch });
  }, []);

  const runUpdateCheck = useCallback(async (opts?: { silent?: boolean; notify?: boolean }) => {
    const { silent = false, notify = !silent } = opts ?? {};
    if (checkingRef.current) return;
    if (downloadingRef.current) return;

    if (!isTauri()) {
      if (!silent) {
        setUpdateState({ status: 'error', detail: translate('settings.about.updates.desktopOnly') });
        if (notify) toast.error(translate('settings.about.updates.syncError'));
      }
      return;
    }

    checkingRef.current = true;
    if (!silent) setUpdateState({ status: 'checking' });
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      const checkedAt = new Date().toISOString();
      if (!update) {
        setUpdateState({ status: 'upToDate' });
        persistCheck(checkedAt, { status: 'upToDate', version: undefined, date: undefined, body: undefined });
        if (notify) toast.success(translate('settings.about.updates.syncUpToDate'));
      } else {
        const pubDate = (update as { date?: string }).date ?? (update as { pub_date?: string }).pub_date;
        setUpdateState({
          status: 'available',
          version: update.version ?? '',
          date: pubDate,
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
        persistCheck(checkedAt, { status: 'available', version: update.version ?? '', date: pubDate, body: update.body ?? undefined });
        if (notify) toast.info(translate('settings.about.updates.syncAvailable', { version: update.version ?? '' }));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (!silent) setUpdateState({ status: 'error', detail });
      const checkedAt = new Date().toISOString();
      persistCheck(checkedAt, { status: 'error' });
      if (notify) toast.error(translate('settings.about.updates.syncError'));
    } finally {
      checkingRef.current = false;
    }
  }, [persistCheck, toast]);

  const syncUpdates = useCallback(async (opts?: { silent?: boolean }) => {
    await runUpdateCheck({ silent: opts?.silent, notify: !opts?.silent });
  }, [runUpdateCheck]);

  const forceUpdateSameVersion = useCallback(async () => {
    if (checkingRef.current) return;
    if (!isTauri()) {
      setUpdateState({ status: 'error', detail: translate('settings.about.updates.desktopOnly') });
      return;
    }
    checkingRef.current = true;
    setUpdateState({ status: 'checking' });
    try {
      const metadata = await invoke<{
        rid: number;
        currentVersion: string;
        version: string;
        date?: string;
        body?: string;
        rawJson: Record<string, unknown>;
      } | null>('force_update_check');
      const checkedAt = new Date().toISOString();
      if (!metadata) {
        setUpdateState({ status: 'error', detail: translate('settings.about.updates.forceUnavailable') });
        persistCheck(checkedAt, { status: 'error' });
      } else {
        const { Update } = await import('@tauri-apps/plugin-updater');
        const update = new Update(metadata);
        const pubDate = (update as { date?: string }).date
          ?? metadata.date
          ?? (typeof metadata.rawJson?.pub_date === 'string' ? metadata.rawJson.pub_date : undefined)
          ?? (typeof metadata.rawJson?.pubDate === 'string' ? metadata.rawJson.pubDate : undefined);
        setUpdateState({
          status: 'available',
          version: update.version ?? metadata.version ?? '',
          date: pubDate,
          body: update.body ?? metadata.body ?? undefined,
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
        persistCheck(checkedAt, { status: 'available', version: update.version ?? metadata.version ?? '', date: pubDate, body: update.body ?? metadata.body ?? undefined });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setUpdateState({ status: 'error', detail });
      persistCheck(new Date().toISOString(), { status: 'error' });
    } finally {
      checkingRef.current = false;
    }
  }, [persistCheck]);

  const downloadAndInstall = useCallback(async () => {
    if (updateState.status !== 'available' || downloadingRef.current) return;
    const { version, date, body, install } = updateState;
    downloadingRef.current = true;
    try {
      setUpdateState({ status: 'downloading', version, progress: 0, date, body });
      await install((pct) => setUpdateState({ status: 'downloading', version, progress: pct, date, body }));
      setUpdateState({ status: 'ready', version, date, body });
      toast.success(translate('settings.about.updates.downloadedToast', { version }));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setUpdateState({ status: 'error', detail });
      toast.error(translate('settings.about.updates.downloadErrorToast'));
    } finally {
      downloadingRef.current = false;
    }
  }, [toast, updateState]);

  const restartApp = useCallback(async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setUpdateState({ status: 'error', detail });
    }
  }, []);

  // Background check on app launch (non-blocking, respects interval cache)
  useEffect(() => {
    if (!isTauri()) return;
    const cache = readCache();
    const last = cache.lastCheckedAt ? Date.parse(cache.lastCheckedAt) : 0;
    const fresh = last && (Date.now() - last) < UPDATE_CHECK_INTERVAL_MS;
    if (fresh) {
      if (cache.lastCheckedAt) setLastCheckedAt(cache.lastCheckedAt);
      return;
    }
    void runUpdateCheck({ silent: true, notify: false });
  }, [runUpdateCheck]);

  const value = useMemo<UpdateContextValue>(() => ({
    updateState,
    lastCheckedAt,
    syncUpdates,
    forceUpdateSameVersion,
    downloadAndInstall,
    restartApp,
  }), [updateState, lastCheckedAt, syncUpdates, forceUpdateSameVersion, downloadAndInstall, restartApp]);

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdates(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdateProvider');
  return ctx;
}
