import { Link } from 'react-router-dom';
import { Database, Lock, ShieldCheck } from 'lucide-react';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

export function PrivacyPanel() {
  const { t } = useI18n();

  return (
    <section className="folio-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Lock size={14} className="text-folio-primary dark:text-folio-accent" />
        <h2 className="text-sm font-semibold text-folio-role-text">{t('dashboard.privacy.title')}</h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-folio-ink/50 dark:text-white/45">
        {t('dashboard.privacy.body')}
      </p>
      <Link
        to="/settings"
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-folio-primary dark:text-folio-accent"
      >
        {t('dashboard.privacy.link')}
      </Link>
    </section>
  );
}

interface Step {
  icon: typeof Database;
  title: MessageKey;
  copy: MessageKey;
}

const STEPS: Step[] = [
  {
    icon: Database,
    title: 'dashboard.onboarding.storageTitle',
    copy: 'dashboard.onboarding.storageBody',
  },
  {
    icon: ShieldCheck,
    title: 'dashboard.onboarding.passcodeTitle',
    copy: 'dashboard.onboarding.passcodeBody',
  },
  {
    icon: Lock,
    title: 'dashboard.onboarding.portableTitle',
    copy: 'dashboard.onboarding.portableBody',
  },
];

export function OnboardingPanel({ onRestore }: { onRestore: () => void }) {
  const { t } = useI18n();

  return (
    <section className="folio-card p-5 sm:p-7">
      <p className="folio-label">{t('dashboard.onboarding.label')}</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">
        {t('dashboard.onboarding.title')}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-folio-ink/55 dark:text-white/50">
        {t('dashboard.onboarding.body')}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/deposits" className="folio-button-primary">
          {t('dashboard.onboarding.addDeposit')}
        </Link>
        <button type="button" onClick={onRestore} className="folio-button">
          {t('dashboard.onboarding.restore')}
        </button>
      </div>
      <div className="mt-7 grid gap-3 border-t border-folio-ink/[0.07] pt-5 dark:border-white/[0.07] sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex gap-3">
            <span className="mt-0.5 text-folio-primary dark:text-folio-accent">
              <Icon size={15} strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-xs font-medium">{t(title)}</p>
              <p className="mt-1 text-[11px] leading-5 text-folio-ink/45 dark:text-white/40">
                {t(copy)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
