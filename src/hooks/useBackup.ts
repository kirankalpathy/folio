import { useCallback, useEffect, useState } from 'react';
import {
  clearLedgerData,
  createBackup,
  restoreBackup,
  saveBackupToChosenLocation,
  totalRecords,
} from '../services/backup';
import { useI18n } from '../i18n';

export type BackupPhase = 'idle' | 'working' | 'success' | 'error';

export interface BackupState {
  phase: BackupPhase;
  message: string;
}

const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface BackupActions {
  state: BackupState;
  isWorking: boolean;
  exportBackup: () => Promise<void>;
  restoreFromFile: (file: File) => Promise<void>;
  clearLedger: () => Promise<void>;
  dismiss: () => void;
}

export function useBackup(): BackupActions {
  const { t } = useI18n();
  const [state, setState] = useState<BackupState>({ phase: 'idle', message: '' });

  useEffect(() => {
    if (state.phase !== 'success' && state.phase !== 'error') return;

    const timer = window.setTimeout(() => {
      setState({ phase: 'idle', message: '' });
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.message]);

  const exportBackup = useCallback(async () => {
    setState({ phase: 'working', message: t('backup.preparing') });
    try {
      const backup = await createBackup();
      const saved = await saveBackupToChosenLocation(backup);
      if (!saved) {
        setState({ phase: 'idle', message: '' });
        return;
      }
      const count = totalRecords({
        stocks: backup.data.stocks.length,
        bonds: backup.data.bonds.length,
        pfAccounts: backup.data.pfAccounts.length,
        deposits: backup.data.deposits.length,
        commodities: backup.data.commodities.length,
        debts: backup.data.debts.length,
      });
      setState({
        phase: 'success',
        message: t(count === 1 ? 'backup.saved.one' : 'backup.saved.other', { count }),
      });
    } catch (error) {
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : t('backup.createError'),
      });
    }
  }, [t]);

  const restoreFromFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BACKUP_BYTES) {
        setState({ phase: 'error', message: t('backup.tooLarge') });
        return;
      }

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
        setState({
          phase: 'success',
          message: t(
            result.total === 1 ? 'backup.restored.one' : 'backup.restored.other',
            { count: result.total },
          ),
        });
      } catch (error) {
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : t('backup.restoreError'),
        });
      }
    },
    [t],
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
