import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type StatTone = 'default' | 'positive' | 'negative' | 'accent';

interface StatCardProps {
  label: ReactNode;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
}

const toneClasses: Record<StatTone, string> = {
  default: 'text-folio-ink dark:text-[#F7EFE9]',
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
}: StatCardProps) {
  return (
    <div className="folio-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="folio-label min-w-0 flex-1">{label}</div>
        {icon && <span className="text-folio-ink/30 dark:text-white/30">{icon}</span>}
      </div>
      <p className={cn('folio-value mt-2 text-[1.15rem] leading-tight', toneClasses[tone])}>
        {value}
      </p>
      {hint && (
        <div className="mt-1.5 text-[11px] leading-5 text-folio-ink/45 dark:text-white/40">{hint}</div>
      )}
    </div>
  );
}
