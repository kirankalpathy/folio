import { Spin } from 'antd';
import { cn } from '../../utils/cn';

interface AppLoadingScreenProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
  logoClassName?: string;
  spinnerSize?: 'small' | 'default' | 'large';
}

export default function AppLoadingScreen({
  message,
  className,
  fullScreen = true,
  logoClassName = 'h-20 w-auto sm:h-24',
  spinnerSize = 'large',
}: AppLoadingScreenProps) {
  return (
    <div
      className={cn(
        'grid place-items-center bg-folio-paper dark:bg-folio-night',
        fullScreen ? 'min-h-screen pt-[var(--folio-titlebar-height,0px)]' : 'p-10',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <img
          src="/folio-horizontal-color.svg"
          alt="Folio"
          className={cn('select-none', logoClassName)}
          decoding="async"
        />
        <Spin size={spinnerSize} />
        {message ? (
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-folio-ink/35 dark:text-white/30">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
