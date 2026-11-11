import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type StatTone = 'default' | 'positive' | 'negative' | 'accent';

interface StatCardProps {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  onValueClick?: () => void;
  valueAriaLabel?: string;
}

const toneClasses: Record<StatTone, string> = {
  default: 'text-folio-ink dark:text-folio-cream',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-rose-700 dark:text-rose-400',
  accent: 'text-folio-primary dark:text-folio-accent',
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  onValueClick,
  valueAriaLabel,
}: StatCardProps) {
  return (
    <div className="folio-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="folio-label min-w-0 flex-1 font-semibold">{label}</div>
        {icon && <span className="text-folio-ink/30 dark:text-white/30">{icon}</span>}
      </div>
      {value !== undefined && value !== null && value !== '' ? (
        onValueClick ? (
          <button
            type="button"
            onClick={onValueClick}
            aria-label={valueAriaLabel}
            className={cn(
              'folio-value mt-2 block text-left text-[1.15rem] leading-tight underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folio-primary/40 rounded-sm',
              toneClasses[tone],
            )}
          >
            {value}
          </button>
        ) : typeof value === 'string' || typeof value === 'number' ? (
          <p className={cn('folio-value mt-2 text-[1.15rem] leading-tight', toneClasses[tone])}>
            {value}
          </p>
        ) : (
          <div className={cn('mt-2', toneClasses[tone])}>{value}</div>
        )
      ) : null}
      {hint && (
        <div className="mt-1.5 text-[0.6875rem] leading-5 text-folio-ink/45 dark:text-white/40">{hint}</div>
      )}
    </div>
  );
}
