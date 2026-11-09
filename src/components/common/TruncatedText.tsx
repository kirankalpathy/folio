import type { ReactNode } from 'react';
import { Tooltip } from 'antd';

export default function TruncatedText({
  text,
  maxLength = 30,
  className,
  block = false,
}: {
  text: string | null | undefined;
  maxLength?: number;
  className?: string;
  block?: boolean;
}): ReactNode {
  const value = (text ?? '').trim();
  if (!value) return <span className={className}>—</span>;
  if (value.length <= maxLength) return <span className={className}>{value}</span>;

  const truncatedClass = [className, block ? 'block truncate' : 'inline-block max-w-full truncate align-bottom'].filter(Boolean).join(' ');
  return (
    <Tooltip title={value}>
      <span className={truncatedClass}>{value}</span>
    </Tooltip>
  );
}
