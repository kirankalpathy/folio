import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { App as AntApp } from 'antd';
import { useI18n } from '../../i18n';

type StashFn = () => void | Promise<void>;

interface GuardRegistration {
  when: boolean;
  onStash?: StashFn;
}

interface UnsavedChangesContextValue {
  register: (id: string, reg: GuardRegistration) => void;
  unregister: (id: string) => void;
  /** Returns true if navigation should proceed (after confirm/stash when dirty). */
  confirmNavigation: (proceed: () => void) => void;
  isDirty: boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

function isInternalHashHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith('#/')) return true;
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && url.hash.startsWith('#/');
  } catch {
    return false;
  }
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { modal } = AntApp.useApp();
  const { t } = useI18n();
  const regsRef = useRef<Map<string, GuardRegistration>>(new Map());
  const [dirty, setDirty] = useState(false);
  const confirmingRef = useRef(false);

  const syncDirty = useCallback(() => {
    let any = false;
    regsRef.current.forEach((r) => { if (r.when) any = true; });
    setDirty(any);
  }, []);

  const register = useCallback((id: string, reg: GuardRegistration) => {
    regsRef.current.set(id, reg);
    syncDirty();
  }, [syncDirty]);

  const unregister = useCallback((id: string) => {
    regsRef.current.delete(id);
    syncDirty();
  }, [syncDirty]);

  const runStash = useCallback(async () => {
    for (const reg of regsRef.current.values()) {
      if (reg.when && reg.onStash) await reg.onStash();
    }
  }, []);

  const confirmNavigation = useCallback((proceed: () => void) => {
    let any = false;
    regsRef.current.forEach((r) => { if (r.when) any = true; });
    if (!any || confirmingRef.current) {
      if (!any) proceed();
      return;
    }
    confirmingRef.current = true;
    modal.confirm({
      title: t('common.unsavedChanges.title'),
      content: t('common.unsavedChanges.body'),
      okText: t('common.unsavedChanges.proceed'),
      cancelText: t('common.unsavedChanges.stay'),
      centered: true,
      onOk: async () => {
        try {
          await runStash();
        } finally {
          confirmingRef.current = false;
        }
        proceed();
      },
      onCancel: () => {
        confirmingRef.current = false;
      },
    });
  }, [modal, runStash, t]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      let any = false;
      regsRef.current.forEach((r) => { if (r.when) any = true; });
      if (!any || e.defaultPrevented || confirmingRef.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      const href = anchor.getAttribute('href') || '';
      if (!isInternalHashHref(href) && !href.startsWith('#/')) return;
      // same location?
      const current = window.location.hash || '#/';
      const nextHash = href.startsWith('#') ? href : new URL(anchor.href, window.location.href).hash;
      if (!nextHash || nextHash === current) return;
      e.preventDefault();
      e.stopPropagation();
      confirmNavigation(() => {
        window.location.hash = nextHash.startsWith('#') ? nextHash.slice(1) : nextHash;
      });
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [confirmNavigation]);

  const value = useMemo<UnsavedChangesContextValue>(() => ({ register, unregister, confirmNavigation, isDirty: dirty }), [register, unregister, confirmNavigation, dirty]);
  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChangesGuard() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error('useUnsavedChangesGuard must be used within UnsavedChangesProvider');
  return ctx;
}

export function useUnsavedChanges(id: string, reg: GuardRegistration) {
  const { register, unregister } = useUnsavedChangesGuard();
  const regRef = useRef(reg);
  regRef.current = reg;
  useEffect(() => {
    register(id, regRef.current);
    return () => unregister(id);
  }, [id, register, unregister]);
  useEffect(() => {
    register(id, reg);
  }, [id, reg.when, register, reg]); // eslint-disable-line react-hooks/exhaustive-deps
}
