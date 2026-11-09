import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Spin } from 'antd';

interface BusyIndicatorContextValue {
  /** Shows or hides the global busy overlay. Defaults to `true` when called without arguments. */
  setBusyIndicator: (active?: boolean) => void;
  isBusy: boolean;
}

const BusyIndicatorContext = createContext<BusyIndicatorContextValue | null>(null);

export function BusyIndicatorProvider({ children }: { children: ReactNode }) {
  const [isBusy, setIsBusy] = useState(false);

  const setBusyIndicator = useCallback((active?: boolean) => {
    setIsBusy(active ?? true);
  }, []);

  const value = useMemo(() => ({ setBusyIndicator, isBusy }), [setBusyIndicator, isBusy]);

  return (
    <BusyIndicatorContext.Provider value={value}>
      {children}
      {isBusy ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/25 dark:bg-black/40"
        >
          <Spin size="large" />
        </div>
      ) : null}
    </BusyIndicatorContext.Provider>
  );
}

export function useBusyIndicator(): BusyIndicatorContextValue {
  const ctx = useContext(BusyIndicatorContext);
  if (!ctx) {
    throw new Error('useBusyIndicator must be used within a BusyIndicatorProvider');
  }
  return ctx;
}
