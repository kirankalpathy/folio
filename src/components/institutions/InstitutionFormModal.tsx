import { Modal } from 'antd';
import type { FinancialInstitution, FinancialInstitutionInput } from '../../types';
import { useI18n } from '../../i18n';
import InstitutionWizard from './InstitutionWizard';

interface Props {
  open: boolean;
  institution: FinancialInstitution | null;
  onCancel: () => void;
  onSubmit: (values: FinancialInstitutionInput) => Promise<void>;
}

export default function InstitutionFormModal({ open, institution, onCancel, onSubmit }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={institution ? t('institutions.edit') : t('institutions.add')}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={760}
    >
      {open && <InstitutionWizard institution={institution} onCancel={onCancel} onSubmit={onSubmit} />}
    </Modal>
  );
}
