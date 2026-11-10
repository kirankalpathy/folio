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
  const channelLabel = channel === 'dev' ? 'DEVELOPMENT' : channel;

  return (
    <div role="region" aria-labelledby="settings-about" className="space-y-4">
      <div id="settings-about" className="flex items-center justify-center pb-1 pt-1">
        <img src="/folio-color.svg" alt="Folio" className="h-20 w-auto dark:hidden" />
        <img src="/folio-inverse.svg" alt="Folio" className="hidden h-20 w-auto dark:block" />
      </div>
      <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <span className="text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.about.version')}</span>
          <span className="font-mono text-sm text-folio-ink/80 dark:text-white/80">{version}</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
          <span className="text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.about.channel')}</span>
          {channelLabel ? (
            <Tag
              color="blue"
              className="!m-0 !rounded-full !border-0 !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]"
            >
              {channelLabel}
            </Tag>
          ) : (
            <span className="text-sm text-folio-ink/50 dark:text-white/45">—</span>
          )}
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-folio-ink/55 dark:text-white/50">
        <span>{t('settings.about.madeWith')}</span>
        <Heart size={13} className="fill-rose-500 text-rose-500" aria-label="love" />
        <span>{t('settings.about.inIndia')}</span>
        <span>India</span>
        <IndianFlagIcon />
      </p>
    </div>
  );
}
