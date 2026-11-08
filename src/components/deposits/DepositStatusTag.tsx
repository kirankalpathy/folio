import { Tag } from 'antd';
import type { CSSProperties } from 'react';
import type { DepositLifecycleStatus } from '../../utils/deposits';
import { useI18n } from '../../i18n';

type SemanticKind = 'info' | 'success' | 'warning' | 'error';

export const DEPOSIT_STATUS_SEMANTIC: Record<DepositLifecycleStatus, SemanticKind> = {
  planned: 'info',
  active: 'success',
  matured: 'warning',
  'pre-closed': 'error',
  'in-lien': 'error',
};

export const FOLIO_TAG_CLASS = '!m-0 !rounded-full !px-2 !py-0.5 !font-mono !text-[9px] !font-medium uppercase tracking-[0.06em]';

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
    planned: 'deposit.lifecycle.planned',
    active: 'deposit.lifecycle.active',
    matured: 'deposit.lifecycle.matured',
    'pre-closed': 'deposit.lifecycle.preClosed',
    'in-lien': 'deposit.lifecycle.inLien',
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
