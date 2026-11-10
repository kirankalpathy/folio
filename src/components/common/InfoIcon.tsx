import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type InfoIconType = 'info' | 'success' | 'warning' | 'error';

interface InfoIconProps {
  type?: InfoIconType;
  children?: ReactNode;
  className?: string;
  size?: number;
}

const typeClassName: Record<InfoIconType, string> = {
  info: 'text-folio-info-accent',
  success: 'text-folio-success-accent',
  warning: 'text-folio-warning-accent',
  error: 'text-folio-error-accent',
};

export default function InfoIcon({ type = 'info', children, className, size = 14 }: InfoIconProps) {
  const icon = (
    <span
      className={cn('inline-flex cursor-help items-center justify-center align-middle', typeClassName[type], className)}
      aria-label={typeof children === 'string' ? children : 'Info'}
      role={children ? 'img' : undefined}
    >
      <Info size={size} />
    </span>
  );

  if (!children) return icon;

  return <Tooltip title={children}>{icon}</Tooltip>;
}
