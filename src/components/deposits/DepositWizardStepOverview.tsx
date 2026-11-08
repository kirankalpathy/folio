import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Divider, Form, Input, Select } from 'antd';
import { CircleEllipsis, Landmark, Plus, Repeat, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import InstitutionFormModal from '../institutions/InstitutionFormModal';
import { institutionLabel } from '../../services/financialInstitutions';
import type { DepositType, FinancialInstitutionInput } from '../../types';
import { ACCOUNT_OPTIONS, type DepositFormValues } from './depositFormModel';

function AccountTypeLabel({ type, label }: { type: DepositType; label: string }) {
  const icons: Partial<Record<DepositType, ReactNode>> = {
    fd: <Landmark size={15} className="text-emerald-600 dark:text-emerald-400" />,
    rd: <Repeat size={15} className="text-sky-600 dark:text-sky-400" />,
    'tax-saving': <ShieldCheck size={15} className="text-violet-600 dark:text-violet-400" />,
    other: <CircleEllipsis size={15} className="text-folio-primary dark:text-folio-accent" />,
  };
  return <span className="inline-flex items-center gap-2">{icons[type] ?? icons.other}<span>{label}</span></span>;
}

export default function DepositWizardStepOverview({ activeLocked = false, terminalLocked = false }: { activeLocked?: boolean; terminalLocked?: boolean }) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const { institutions, create } = useFinancialInstitutions();
  const [createOpen, setCreateOpen] = useState(false);
  const fullyLocked = terminalLocked;
  const locked = fullyLocked || activeLocked;
  const required = t('validation.required');

  const eligibleInstitutions = useMemo(
    () => institutions.filter((fi) => fi.category === 'savings-account' || fi.category === 'current-account'),
    [institutions],
  );

  useEffect(() => {
    const id = form.getFieldValue('financialInstitutionId') as string | undefined;
    const bankName = form.getFieldValue('bankName') as string | undefined;
    if (!id && bankName && eligibleInstitutions.length > 0) {
      const match = eligibleInstitutions.find((fi) => institutionLabel(fi) === bankName || fi.name === bankName);
      if (match) form.setFieldsValue({ financialInstitutionId: match.id, bankName: institutionLabel(match) });
    }
  }, [form, eligibleInstitutions]);

  const institutionOptions = eligibleInstitutions.map((fi) => ({
    value: fi.id,
    label: institutionLabel(fi),
    search: `${institutionLabel(fi)} ${fi.name}`,
  }));

  return (
    <div className="grid gap-x-4 sm:grid-cols-2">
      <Form.Item label={t('deposit.fields.depositNumber')} name="depositNumber" rules={[{ required: true, whitespace: true, message: required }]}>
        <Input disabled={locked} placeholder={t('deposit.placeholder.depositNumber')} maxLength={40} />
      </Form.Item>
      <Form.Item label={t('deposit.fields.name')} name="name" rules={[{ required: true, whitespace: true, message: required }, { min: 2, message: t('validation.nameLength') }]}>
        <Input disabled={fullyLocked} placeholder={t('deposit.placeholder.name')} maxLength={80} />
      </Form.Item>
      <div className="sm:col-span-1">
        <Form.Item label={t('deposit.fields.institution')} name="financialInstitutionId" className="mb-1" rules={[{ validator: async () => { const id = form.getFieldValue('financialInstitutionId'); if (id) return; throw new Error(required); } }]}>
          <Select
            disabled={locked}
            showSearch allowClear placeholder={t('deposit.placeholder.institution')} options={institutionOptions} optionFilterProp="search"
            onChange={(id?: string) => {
              const fi = eligibleInstitutions.find((i) => i.id === id);
              form.setFieldsValue({ bankName: fi ? institutionLabel(fi) : '' });
              void form.validateFields(['financialInstitutionId']);
            }}
            popupRender={(menu) => (
              <>
                {menu}
                {!locked && (
                  <>
                    <Divider style={{ margin: '6px 0' }} />
                    <Button type="text" block icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>{t('deposit.createInstitution')}</Button>
                  </>
                )}
              </>
            )}
          />
        </Form.Item>
        <Alert type="info" showIcon title={t('deposit.info.eligibleInstitutions')} className="folio-message-strip folio-message-strip-info mb-4 py-1" />
      </div>
      <Form.Item name="bankName" hidden><Input /></Form.Item>
      <Form.Item label={t('deposit.fields.accountType')} name="accountType" rules={[{ required: true, message: required }]}>
        <Select
          disabled={locked}
          options={ACCOUNT_OPTIONS.map((o) => ({ value: o.value, label: <AccountTypeLabel type={o.value} label={t(o.label)} /> }))}
          optionLabelProp="label"
        />
      </Form.Item>
      <InstitutionFormModal open={createOpen} institution={null} onCancel={() => setCreateOpen(false)} onSubmit={async (values: FinancialInstitutionInput) => { const fi = await create(values); form.setFieldsValue({ financialInstitutionId: fi.id, bankName: institutionLabel(fi) }); setCreateOpen(false); void form.validateFields(['financialInstitutionId']); }} />
    </div>
  );
}
