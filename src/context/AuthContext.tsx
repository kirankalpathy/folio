import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthStatus, ProfileInput, UserProfile } from '../types';
import { translate } from '../i18n';
import {
  acknowledgeRecovery as persistRecoveryAcknowledged,
  clearSession,
  createCredential,
  createPasscodeFreeCredential,
  disablePasscode as disablePasscodeRecord,
  enablePasscode as enablePasscodeRecord,
  getCredential,
  isPasscodeFree,
  isSessionUnlocked,
  markSessionUnlocked,
  resetPasscodeWithRecovery,
  updatePasscode,
  verifyPasscode,
  type RecoveryFileData,
} from '../services/auth';
import { deleteEntireLedger } from '../services/backup';
import { getProfile, saveProfile } from '../services/profile';

export interface SetupAccountInput {
  firstName: string;
  lastName?: string;
  email: string;
  passcode?: string;
  passcodeFree?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  profile: UserProfile | null;
  passcodeProtected: boolean;
  pendingRecovery: RecoveryFileData | null;
  initError: string | null;
  setupAccount: (input: SetupAccountInput) => Promise<void>;
  acknowledgeRecovery: () => Promise<void>;
  unlock: (passcode?: string) => Promise<void>;
  resetPasscode: (file: File, newPasscode: string) => Promise<void>;
  lock: () => void;
  retry: () => void;
  updateProfile: (input: ProfileInput) => Promise<void>;
  changePasscode: (currentPasscode: string, nextPasscode: string) => Promise<void>;
  enablePasscode: (newPasscode: string) => Promise<RecoveryFileData>;
  disablePasscode: (currentPasscode: string) => Promise<void>;
  deleteLedger: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [passcodeProtected, setPasscodeProtected] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<RecoveryFileData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setInitError(null);
    setPendingRecovery(null);

    void (async () => {
      try {
        const [credential, storedProfile] = await Promise.all([getCredential(), getProfile()]);
        if (!active) return;
        setProfile(storedProfile);
        const protectedLedger = Boolean(credential && !isPasscodeFree(credential));
        setPasscodeProtected(protectedLedger);
        if (!credential || !storedProfile) setStatus('setup');
        else setStatus(isSessionUnlocked() ? 'unlocked' : 'locked');
      } catch (error) {
        if (!active) return;
        setInitError(error instanceof Error ? error.message : translate('errors.storage.open'));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const setupAccount = useCallback(async (input: SetupAccountInput) => {
    const saved = await saveProfile({ firstName: input.firstName, lastName: input.lastName ?? '', email: input.email });
    if (input.passcodeFree) {
      await createPasscodeFreeCredential();
      setPasscodeProtected(false);
      setPendingRecovery(null);
      markSessionUnlocked();
      setProfile(saved);
      setStatus('unlocked');
      return;
    }
    const result = await createCredential(input.passcode ?? '');
    setPasscodeProtected(true);
    setProfile(saved);
    setPendingRecovery(result.recoveryFile);
    setStatus('recovery');
  }, []);

  const acknowledgeRecovery = useCallback(async () => {
    await persistRecoveryAcknowledged();
    setPendingRecovery(null);
    markSessionUnlocked();
    setStatus('unlocked');
  }, []);

  const unlock = useCallback(async (passcode?: string) => {
    if (passcodeProtected) {
      const valid = await verifyPasscode(passcode ?? '');
      if (!valid) throw new Error(translate('errors.auth.incorrect'));
    }
    markSessionUnlocked();
    setStatus('unlocked');
  }, [passcodeProtected]);

  const resetPasscode = useCallback(async (file: File, newPasscode: string) => {
    await resetPasscodeWithRecovery(file, newPasscode);
    setPasscodeProtected(true);
    markSessionUnlocked();
    setStatus('unlocked');
  }, []);

  const lock = useCallback(() => { clearSession(); setStatus('locked'); }, []);
  const retry = useCallback(() => setReloadToken((token) => token + 1), []);
  const updateProfile = useCallback(async (input: ProfileInput) => { setProfile(await saveProfile(input)); }, []);
  const changePasscode = useCallback(async (currentPasscode: string, nextPasscode: string) => {
    if (!passcodeProtected) throw new Error(translate('errors.auth.passcodeNotEnabled'));
    const valid = await verifyPasscode(currentPasscode);
    if (!valid) throw new Error(translate('errors.auth.currentIncorrect'));
    await updatePasscode(nextPasscode);
    markSessionUnlocked();
    setPasscodeProtected(true);
  }, [passcodeProtected]);

  const enablePasscode = useCallback(async (newPasscode: string) => {
    const recoveryFile = await enablePasscodeRecord(newPasscode);
    setPasscodeProtected(true);
    markSessionUnlocked();
    return recoveryFile;
  }, []);

  const disablePasscode = useCallback(async (currentPasscode: string) => {
    await disablePasscodeRecord(currentPasscode);
    setPasscodeProtected(false);
    markSessionUnlocked();
  }, []);

  const deleteLedger = useCallback(async () => {
    await deleteEntireLedger();
    clearSession();
    setProfile(null);
    setPasscodeProtected(false);
    setPendingRecovery(null);
    setStatus('setup');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status, profile, passcodeProtected, pendingRecovery, initError, setupAccount, acknowledgeRecovery, unlock, resetPasscode, lock, retry, updateProfile, changePasscode, enablePasscode, disablePasscode, deleteLedger,
  }), [status, profile, passcodeProtected, pendingRecovery, initError, setupAccount, acknowledgeRecovery, unlock, resetPasscode, lock, retry, updateProfile, changePasscode, enablePasscode, disablePasscode, deleteLedger]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
