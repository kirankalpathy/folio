import { useMemo, useState } from 'react';
import { Alert, Button, Divider, Form, Select } from 'antd';
import { Plus } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import InstitutionFormModal from '../institutions/InstitutionFormModal';
import { institutionLabel } from '../../services/financialInstitutions';
import type { FinancialInstitutionInput } from '../../types';
import type { StockBrokerFormValues } from './StockBrokerWizardStepDetails';

export default function StockBrokerWizardStepTransferAccount() {
  const { t } = useI18n();
  const form = Form.useFormInstance<StockBrokerFormValues>();
  const [createInstitutionOpen, setCreateInstitutionOpen] = useState(false);
  const { institutions, create } = useFinancialInstitutions();

  const options = useMemo(
    () => institutions
      .filter((fi) => fi.category === 'savings-account' || fi.category === 'current-account')
      .map((fi) => ({ value: fi.id, label: institutionLabel(fi) })),
    [institutions],
  );

  const handleCreateInstitution = async (input: FinancialInstitutionInput) => {
    const fi = await create(input);
    form.setFieldValue('transferAccountId', fi.id);
    setCreateInstitutionOpen(false);
  };

  return (
    <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
      <Alert
        className="folio-message-strip folio-message-strip-info sm:col-span-2 mb-3"
        showIcon
        type="info"
        title={t('stocks.brokers.transferAccount.sebiAlert')}
      />

      <Form.Item
        name="transferAccountId"
        label={t('stocks.brokers.field.transferAccount')}
        className="sm:col-span-2"
        rules={[{ required: true, message: t('stocks.brokers.validation.transferAccountRequired') }]}
      >
        <Select
          showSearch
          autoFocus
          optionFilterProp="label"
          options={options}
          placeholder={t('stocks.brokers.placeholder.transferAccount')}
          notFoundContent={(
            <div className="py-1">
              <p className="mb-2 text-xs text-folio-ink/55 dark:text-white/45">{t('stocks.brokers.noTransferAccounts')}</p>
              <Button type="link" icon={<Plus size={14} />} onClick={() => setCreateInstitutionOpen(true)} className="!px-0">
                {t('stocks.brokers.addInstitution')}
              </Button>
            </div>
          )}
          popupRender={(menu) => (
            <div className="flex flex-col gap-2 p-1">
              <p className="px-2 pb-1 pt-1 text-[0.6875rem] leading-snug text-folio-ink/55 dark:text-white/45">
                <span className="font-semibold uppercase tracking-[0.08em] text-folio-info dark:text-folio-info">
                  {t('stocks.brokers.transferAccount.dropdownHeader')}
                </span>
                <br />
                {t('stocks.brokers.transferAccount.dropdownHint')}
              </p>
              <div className="min-w-0">{menu}</div>
              <Divider style={{ margin: '4px 0' }} />
              <Button type="text" icon={<Plus size={14} />} onClick={() => setCreateInstitutionOpen(true)} className="justify-start">
                {t('stocks.brokers.addInstitution')}
              </Button>
            </div>
          )}
          onChange={(id) => form.setFieldValue('transferAccountId', id)}
        />
      </Form.Item>

      <InstitutionFormModal
        open={createInstitutionOpen}
        institution={null}
        onCancel={() => setCreateInstitutionOpen(false)}
        onSubmit={handleCreateInstitution}
      />
    </div>
  );
}
