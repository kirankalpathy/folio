import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
  info: (text: string) => void;
}

interface ToastContextValue {
  toast: ToastApi;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const DURATION_MS = 3500;

const STYLES: Record<ToastType, { bg: string; Icon: typeof CheckCircle2 }> = {
  success: { bg: '#34C759', Icon: CheckCircle2 },
  error: { bg: '#FF3B30', Icon: XCircle },
  warning: { bg: '#FF9500', Icon: AlertCircle },
  info: { bg: '#007AFF', Icon: Info },
};

function ToastViewport({ items }: { items: ToastItem[] }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[72px] z-[2000] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => {
        const { bg, Icon } = STYLES[item.type];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto inline-flex max-w-[min(420px,calc(100vw-32px))] items-center gap-2.5 rounded-[14px] px-4 py-3 text-white',
              'shadow-[0_18px_40px_-18px_rgba(42,26,20,0.35),0_8px_18px_-10px_rgba(42,26,20,0.2)]',
              'animate-fade-in',
            )}
            style={{ backgroundColor: bg, fontFamily: '"Inter Variable", Inter, system-ui, sans-serif' }}
          >
            <Icon size={18} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
            <span className="text-[13px] font-semibold leading-[1.35]">{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, text: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, type, text }]);
      const timer = window.setTimeout(() => remove(id), DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [remove],
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
      warning: (text) => push('warning', text),
      info: (text) => push('info', text),
    }),
    [push],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
