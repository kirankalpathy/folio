import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'antd';

function isEllipsized(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
}

export default function TruncatedText({
  text,
  maxLength = 30,
  className,
  block = false,
  truncate = false,
}: {
  text: string | null | undefined;
  maxLength?: number;
  className?: string;
  block?: boolean;
  /** Force CSS truncation and show tooltip only when ellipsized. */
  truncate?: boolean;
}): ReactNode {
  const value = (text ?? '').trim();
  const ref = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    setShowTooltip(el ? isEllipsized(el) : false);
  }, []);

  if (!value) return <span className={className}>—</span>;

  const shouldTruncate = truncate || value.length > maxLength;
  const truncatedClass = [className, shouldTruncate ? (block ? 'block truncate' : 'inline-block max-w-full truncate align-bottom') : undefined].filter(Boolean).join(' ');

  const span = (
    <span
      ref={ref}
      className={truncatedClass || undefined}
      onMouseEnter={update}
      onFocus={update}
    >
      {value}
    </span>
  );

  return showTooltip ? <Tooltip title={value}>{span}</Tooltip> : span;
}
