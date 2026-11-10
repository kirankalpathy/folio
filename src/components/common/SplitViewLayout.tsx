import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SplitViewSection {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
  danger?: boolean;
  /** Render a divider above this item in the navigation panel (desktop). */
  dividerBefore?: boolean;
}

interface SplitViewLayoutProps {
  sections: SplitViewSection[];
  defaultActiveId?: string;
  activeId?: string;
  onActiveChange?: (id: string) => void;
  /** Accessible label for the navigation tablist. */
  ariaLabel: string;
  className?: string;
}

export default function SplitViewLayout({ sections, defaultActiveId, activeId, onActiveChange, ariaLabel, className }: SplitViewLayoutProps) {
  const initial = defaultActiveId && sections.some((s) => s.id === defaultActiveId) ? defaultActiveId : (sections[0]?.id ?? '');
  const [internalActive, setInternalActive] = useState<string>(initial);
  const active = activeId ?? internalActive;
  const setActive = (id: string) => {
    if (activeId === undefined) setInternalActive(id);
    onActiveChange?.(id);
  };
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeSection = useMemo(() => sections.find((s) => s.id === active) ?? sections[0], [active, sections]);

  const focusTab = (index: number) => {
    if (sections.length === 0) return;
    const next = (index + sections.length) % sections.length;
    const section = sections[next];
    if (!section) return;
    setActive(section.id);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(sections.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setActive(sections[index]?.id ?? active);
        break;
      default:
        break;
    }
  };

  if (sections.length === 0) return null;

  return (
    <div className={cn('folio-card flex flex-1 flex-col overflow-hidden', className)}>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-folio-ink/10 p-2 dark:border-white/[0.07] md:w-[240px] md:shrink-0 md:border-b-0 md:border-r">
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={ariaLabel}
            className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
          >
            {sections.map((section, index) => {
              const Icon = section.icon;
              const selected = active === section.id;
              const isDanger = !!section.danger;
              const showDivider = !!section.dividerBefore;
              return (
                <div
                  key={section.id}
                  className={cn(
                    'md:w-full',
                    showDivider && 'md:mt-1 md:pt-2 md:border-t md:border-folio-ink/10 md:dark:border-white/[0.07]',
                  )}
                >
                  <button
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    id={`splitview-tab-${section.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`splitview-panel-${section.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(section.id)}
                    onKeyDown={(e) => onTabKeyDown(e, index)}
                    className={cn(
                      'flex min-w-[160px] items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 md:min-w-0 md:w-full',
                      isDanger
                        ? selected
                          ? 'border border-folio-error-accent bg-folio-error-accent text-folio-paper shadow-sm hover:brightness-95 active:brightness-90 focus-visible:ring-folio-error-accent/40'
                          : 'border border-folio-error-border bg-folio-error-bg/50 text-folio-error-text hover:bg-folio-error-bg/80 hover:text-folio-error-accent focus-visible:ring-folio-error-accent/40'
                        : selected
                          ? 'bg-folio-primary/[0.09] text-folio-primary focus-visible:ring-folio-primary/40 dark:bg-folio-primary/15 dark:text-folio-accent'
                          : 'text-folio-ink/65 hover:bg-folio-ink/[0.04] hover:text-folio-ink focus-visible:ring-folio-primary/40 dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white/85',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section
          id={`splitview-panel-${activeSection?.id ?? ''}`}
          role="tabpanel"
          aria-labelledby={`splitview-tab-${activeSection?.id ?? ''}`}
          tabIndex={0}
          className="flex min-w-0 flex-1 flex-col bg-folio-role-bg-muted/40 p-4 outline-none dark:bg-white/[0.01] sm:p-6"
        >
          <div key={activeSection?.id} className="w-full animate-fade-in">
            {activeSection?.content}
          </div>
        </section>
      </div>
    </div>
  );
}
