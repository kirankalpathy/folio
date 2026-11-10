import { Heart } from 'lucide-react';
import { Tag } from 'antd';
import pkg from '../../../package.json';
import { useI18n } from '../../i18n';
import { INDIA_FLAG_COLORS } from '../../theme/palette';

function IndianFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="India"
      width="18"
      height="12"
      viewBox="0 0 18 12"
      className={className ?? 'overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/10'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="18" height="4" y="0" fill={INDIA_FLAG_COLORS.saffron} />
      <rect width="18" height="4" y="4" fill={INDIA_FLAG_COLORS.white} />
      <rect width="18" height="4" y="8" fill={INDIA_FLAG_COLORS.green} />
      <circle cx="9" cy="6" r="1.35" fill="none" stroke={INDIA_FLAG_COLORS.navy} strokeWidth="0.35" />
      <circle cx="9" cy="6" r="0.2" fill={INDIA_FLAG_COLORS.navy} />
    </svg>
  );
}

export default function AboutCard() {
  const { t } = useI18n();
  const version = typeof pkg.version === 'string' ? pkg.version : '';
  const channel =
    typeof (pkg as { versionChannel?: string }).versionChannel === 'string'
      ? (pkg as { versionChannel?: string }).versionChannel
      : '';

  return (
    <section role="region" aria-labelledby="settings-about" className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <h2 id="settings-about" className="text-sm font-semibold">{t('settings.about.title')}</h2>
      </div>
      <div className="flex flex-col items-center px-4 py-6 text-center sm:px-5">
        <img src="/folio-color.svg" alt="Folio" className="h-24 w-auto dark:hidden" />
        <img src="/folio-inverse.svg" alt="Folio" className="hidden h-24 w-auto dark:block" />
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{t('settings.about.version')} {version}</span>
          {channel && (
            <Tag
              color="blue"
              className="!m-0 !rounded-full !border-0 !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]"
            >
              {channel}
            </Tag>
          )}
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-folio-ink/55 dark:text-white/50">
          <span>{t('settings.about.madeWith')}</span>
          <Heart size={13} className="fill-rose-500 text-rose-500" aria-label="love" />
          <span>{t('settings.about.inIndia')}</span>
          <IndianFlagIcon />
        </p>
      </div>
    </section>
  );
}
