import type { ReactNode } from 'react';
import { Database, Lock, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';


interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

const ASSURANCES: Array<{ icon: typeof ShieldCheck; label: MessageKey }> = [
  { icon: Database, label: 'auth.assurance.device' },
  { icon: Lock, label: 'auth.assurance.passcode' },
  { icon: ShieldCheck, label: 'auth.assurance.account' },
];

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#FBF8F6] dark:bg-[#141414] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-folio-ink px-12 py-12 text-[#F7EFE9] lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full border border-folio-primary/25"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 top-36 h-52 w-52 rounded-full border border-folio-accent/20"
          aria-hidden="true"
        />

        <img src="/folio-inverse.svg" alt="Folio" className="h-32 w-auto self-start" decoding="async" />

        <div className="relative max-w-md">
          <p className="folio-label text-white/40">{t('auth.brand.eyebrow')}</p>
          <h2 className="mt-4 text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.045em]">
            {t('auth.brand.titleOne')}
            <br />
            {t('auth.brand.titleTwo')}
            <br />
            <span className="text-folio-accent">{t('auth.brand.titleThree')}</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">{t('auth.brand.body')}</p>
        </div>

        <ul className="relative space-y-3">
          {ASSURANCES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-xs text-white/50">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-folio-accent">
                <Icon size={14} strokeWidth={1.75} />
              </span>
              {t(label)}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0 lg:px-12">
        <div className="w-full max-w-[430px] animate-fade-in">
          <div className="mb-8 lg:hidden">
            <img src="/folio-horizontal-color.svg" alt="Folio" className="h-14 w-auto" decoding="async" />
          </div>

          <div className="rounded-2xl border border-folio-ink/10 bg-white p-6 shadow-folio-lg dark:border-white/10 dark:bg-[#1E1E1E] sm:p-8">
            <p className="folio-label">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-folio-ink/55 dark:text-white/50">
              {description}
            </p>

            <div className="mt-6">{children}</div>

            {footer && (
              <div className="mt-6 border-t border-folio-ink/10 pt-4 text-[11px] leading-5 text-folio-ink/45 dark:border-white/10 dark:text-white/40">
                {footer}
              </div>
            )}
          </div>


        </div>
      </main>
    </div>
  );
}
