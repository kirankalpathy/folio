import { Tag } from 'antd';
import type { CSSProperties } from 'react';
import { DepositLifecycleStatus } from '../../utils/deposits';
import { useI18n } from '../../i18n';

type SemanticKind = 'info' | 'success' | 'warning' | 'error';

export const DEPOSIT_STATUS_SEMANTIC: Record<DepositLifecycleStatus, SemanticKind> = {
  [DepositLifecycleStatus.Planned]: 'info',
  [DepositLifecycleStatus.Active]: 'success',
  [DepositLifecycleStatus.Matured]: 'warning',
  [DepositLifecycleStatus.PreClosed]: 'error',
  [DepositLifecycleStatus.InLien]: 'error',
};

export const FOLIO_TAG_CLASS = '!m-0 !rounded-full !px-2 !py-0.5 !font-mono !text-[0.5625rem] !font-medium uppercase tracking-[0.06em]';

export function semanticTagStyle(kind: SemanticKind): CSSProperties {
  return {
    background: `var(--folio-${kind}-bg)`,
    border: `1px solid var(--folio-${kind}-border)`,
    color: `var(--folio-${kind}-text)`,
  };
}

export function useDepositStatusLabel(status: DepositLifecycleStatus): string {
  const { t } = useI18n();
  const keys = {
    [DepositLifecycleStatus.Planned]: 'deposit.lifecycle.planned',
    [DepositLifecycleStatus.Active]: 'deposit.lifecycle.active',
    [DepositLifecycleStatus.Matured]: 'deposit.lifecycle.matured',
    [DepositLifecycleStatus.PreClosed]: 'deposit.lifecycle.preClosed',
    [DepositLifecycleStatus.InLien]: 'deposit.lifecycle.inLien',
  } as const;
  return t(keys[status]);
}

export default function DepositStatusTag({ status, className }: { status: DepositLifecycleStatus; className?: string }) {
  const label = useDepositStatusLabel(status);
  return (
    <Tag
      bordered={false}
      style={semanticTagStyle(DEPOSIT_STATUS_SEMANTIC[status])}
      className={`${FOLIO_TAG_CLASS}${className ? ` ${className}` : ''}`}
    >
      {label}
    </Tag>
  );
}
