import { Button, Tooltip } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import type { DepositHolding } from '../../types';
import { useI18n } from '../../i18n';

interface DepositRowActionsProps {
  deposit: DepositHolding;
  onEdit: (deposit: DepositHolding) => void;
  onDelete: (deposit: DepositHolding) => void;
}

export default function DepositRowActions({
  deposit,
  onEdit,
  onDelete,
}: DepositRowActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Tooltip title={t('deposit.row.edit')}>
        <Button
          type="text"
          size="small"
          aria-label={t('deposit.row.editName', { name: deposit.name })}
          icon={<Pencil size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(deposit);
          }}
        />
      </Tooltip>
      <Tooltip title={t('deposit.row.delete')}>
        <Button
          type="text"
          size="small"
          danger
          aria-label={t('deposit.row.deleteName', { name: deposit.name })}
          icon={<Trash2 size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deposit);
          }}
        />
      </Tooltip>
    </div>
  );
}
