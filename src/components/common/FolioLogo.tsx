import { cn } from '../../utils/cn';

interface FolioLogoProps {
  compact?: boolean;
  className?: string;
}

export default function FolioLogo({ compact = false, className }: FolioLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/folio-icon-color.svg"
        alt="Folio"
        width={32}
        height={32}
        className="shrink-0"
        decoding="async"
      />
      {!compact && (
        <span className="font-sans text-[19px] font-semibold tracking-[-0.035em]">
          Folio<span className="text-folio-primary">.</span>
        </span>
      )}
    </div>
  );
}
