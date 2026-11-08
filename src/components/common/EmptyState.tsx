import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-start gap-3 px-2 py-6'
          : 'flex flex-col items-center gap-3 px-6 py-12 text-center'
      }
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-folio-primary/20 bg-folio-primary/[0.07] text-folio-primary dark:text-folio-accent">
        <Icon size={20} strokeWidth={1.6} />
      </span>
      <div className={compact ? '' : 'max-w-sm'}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-folio-ink/50 dark:text-white/45">
          {description}
        </p>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
