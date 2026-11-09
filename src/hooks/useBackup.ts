import { useCallback, useEffect, useState } from 'react';
import type { BackupReport } from '../types';
import {
  buildExportReport,
  clearLedgerData,
  createBackup,
  restoreBackup,
  saveBackupToChosenLocation,
} from '../services/backup';
import { useBusyIndicator } from '../components/common/BusyIndicator';
import { useI18n } from '../i18n';

export type BackupPhase = 'idle' | 'working' | 'success' | 'error';

export interface BackupState {
  phase: BackupPhase;
  message: string;
}

export type BackupOpResult = { ok: true; report: BackupReport } | { ok: false; cancelled?: boolean; message: string };

const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface BackupActions {
  state: BackupState;
  isWorking: boolean;
  exportBackup: () => Promise<BackupOpResult>;
  restoreFromFile: (file: File) => Promise<BackupOpResult>;
  clearLedger: () => Promise<void>;
  dismiss: () => void;
}

export function useBackup(): BackupActions {
  const { t } = useI18n();
  const { setBusyIndicator } = useBusyIndicator();
  const [state, setState] = useState<BackupState>({ phase: 'idle', message: '' });

  useEffect(() => {
    if (state.phase !== 'success' && state.phase !== 'error') return;

    const timer = window.setTimeout(() => {
      setState({ phase: 'idle', message: '' });
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.message]);

  const exportBackup = useCallback(async (): Promise<BackupOpResult> => {
    setBusyIndicator();
    setState({ phase: 'working', message: t('backup.preparing') });
    try {
      const backup = await createBackup();
      const saved = await saveBackupToChosenLocation(backup);
      if (!saved) {
        setState({ phase: 'idle', message: '' });
        return { ok: false, cancelled: true, message: '' };
      }
      const report = buildExportReport(backup);
      setState({ phase: 'idle', message: '' });
      return { ok: true, report };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('backup.createError');
      setState({ phase: 'error', message });
      return { ok: false, message };
    } finally {
      setBusyIndicator(false);
    }
  }, [setBusyIndicator, t]);

  const restoreFromFile = useCallback(
    async (file: File): Promise<BackupOpResult> => {
      if (file.size > MAX_BACKUP_BYTES) {
        const message = t('backup.tooLarge');
        setState({ phase: 'error', message });
        return { ok: false, message };
      }

      setBusyIndicator();
      setState({ phase: 'working', message: t('backup.restoring') });
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(t('backup.invalidFile'));
        }

        const result = await restoreBackup(parsed);
        console.info('[folio/backup] restore result', result);
        setState({ phase: 'idle', message: '' });
        return { ok: true, report: result.report };
      } catch (error) {
        console.error('[folio/backup] restore failed', error);
        const message =
          error instanceof Error ? (error.message || t('backup.restoreError')) :
          typeof error === 'string' ? error :
          t('backup.restoreError');
        setState({ phase: 'error', message });
        return { ok: false, message };
      } finally {
        setBusyIndicator(false);
      }
    },
    [setBusyIndicator, t],
  );

  const clearLedger = useCallback(async () => {
    setState({ phase: 'working', message: t('backup.clearing') });
    try {
      await clearLedgerData();
      setState({ phase: 'success', message: t('backup.cleared') });
    } catch (error) {
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : t('backup.clearError'),
      });
    }
  }, [t]);

  const dismiss = useCallback(() => setState({ phase: 'idle', message: '' }), []);

  return {
    state,
    isWorking: state.phase === 'working',
    exportBackup,
    restoreFromFile,
    clearLedger,
    dismiss,
  };
}
