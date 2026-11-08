import { useMemo, useState, useEffect } from 'react';
import { Alert, Button, Checkbox, DatePicker, Divider, Form, Input, InputNumber, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Plus } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import InstitutionFormModal from '../institutions/InstitutionFormModal';
import { institutionLabel } from '../../services/financialInstitutions';
import type { FinancialInstitutionInput } from '../../types';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues, formatDepositTenure } from '../../utils/deposits';
import {
  ACCOUNT_OPTIONS,
  COMPOUNDING_OPTIONS,
  PAYOUT_OPTIONS,
  ROLLOVER_OPTIONS,
  type DepositFormValues,
} from './depositFormModel';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-3 dark:border-white/[0.07]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function DepositFormSections({
  readOnly = false,
  activeLocked = false,
  terminalLocked = false,
}: {
  readOnly?: boolean;
  activeLocked?: boolean;
  terminalLocked?: boolean;
}) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const { institutions, create } = useFinancialInstitutions();
  const [createOpen, setCreateOpen] = useState(false);
  const cumulative = Form.useWatch('cumulativeInterest', form) ?? false;
  const principal = Form.useWatch('principal', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const startDate = Form.useWatch('startDate', form) as Dayjs | undefined;
  const maturityDate = Form.useWatch('maturityDate', form) as Dayjs | undefined;
  const compoundingFrequency = Form.useWatch('compoundingFrequency', form);
  const preClosed = Form.useWatch('preClosed', form) ?? false;
  const preClosureCreditedValue = Form.useWatch('preClosureCreditedValue', form);
  const fullyLocked = readOnly || terminalLocked;
  const locked = fullyLocked || activeLocked;

  useEffect(() => {
    const id = form.getFieldValue('financialInstitutionId') as string | undefined;
    const bankName = form.getFieldValue('bankName') as string | undefined;
    if (!id && bankName && institutions.length > 0) {
      const match = institutions.find((fi) => institutionLabel(fi) === bankName || fi.name === bankName);
      if (match) form.setFieldsValue({ financialInstitutionId: match.id, bankName: institutionLabel(match) });
    }
  }, [form, institutions]);

  const institutionOptions = institutions.map((fi) => ({
    value: fi.id,
    label: institutionLabel(fi),
    search: `${institutionLabel(fi)} ${fi.name} ${fi.accountNumber}`,
  }));

  const computed = useMemo(
    () =>
      calculateDepositValues({
        principal,
        interestRate,
        startDate: startDate?.format('YYYY-MM-DD') ?? '',
        maturityDate: maturityDate?.format('YYYY-MM-DD') ?? '',
        cumulativeInterest: cumulative,
        compoundingFrequency,
      }),
    [principal, interestRate, startDate, maturityDate, cumulative, compoundingFrequency],
  );

  const tenure = formatDepositTenure(startDate?.format('YYYY-MM-DD'), maturityDate?.format('YYYY-MM-DD'));

  return (
    <div className="space-y-4">
      <Section title={t('deposit.section.overview')}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label={t('deposit.fields.depositNumber')} name="depositNumber" rules={[{ required: true, whitespace: true, message: t('deposit.validation.depositNumberRequired') }]}>
            <Input disabled={locked} placeholder={t('deposit.placeholder.depositNumber')} maxLength={40} />
          </Form.Item>
          <Form.Item label={t('deposit.fields.name')} name="name" rules={[{ required: true, whitespace: true, message: t('deposit.validation.nameRequired') }, { min: 2, message: t('validation.nameLength') }]}>
            <Input disabled={fullyLocked} placeholder={t('deposit.placeholder.name')} maxLength={80} />
          </Form.Item>
          <Form.Item label={t('deposit.fields.institution')} name="financialInstitutionId" rules={[{ validator: async () => { const id = form.getFieldValue('financialInstitutionId'); if (id) return; throw new Error(t('deposit.validation.institutionRequired')); } }]}>
            <Select
              disabled={locked}
              showSearch allowClear placeholder={t('deposit.placeholder.institution')} options={institutionOptions} optionFilterProp="search"
              onChange={(id?: string) => {
                const fi = institutions.find((i) => i.id === id);
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
          <Form.Item name="bankName" hidden rules={[{ required: true, message: t('deposit.validation.institutionRequired') }]}><Input /></Form.Item>
          <Form.Item label={t('deposit.fields.accountType')} name="accountType" rules={[{ required: true, message: t('deposit.validation.accountTypeRequired') }]}>
            <Select disabled={locked} options={ACCOUNT_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
          </Form.Item>
        </div>
      </Section>

      <Section title={t('deposit.section.investment')}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label={t('deposit.fields.principal')} name="principal" rules={[{ required: true, message: t('deposit.validation.principalRequired') }]}>
            <InputNumber disabled={locked} className="w-full" min={0} precision={2} prefix="₹" placeholder={t('deposit.placeholder.principal')} />
          </Form.Item>
          <Form.Item label={t('deposit.fields.interestRate')} name="interestRate" rules={[{ required: true, message: t('deposit.validation.rateRequired') }]}>
            <InputNumber disabled={locked} className="w-full" min={0} max={100} precision={2} suffix={t('deposit.suffix.rate')} placeholder={t('deposit.placeholder.rate')} />
          </Form.Item>
          <Form.Item label={t('deposit.fields.startDate')} name="startDate" rules={[{ required: true, message: t('deposit.validation.startDateRequired') }]}>
            <DatePicker disabled={locked} className="w-full" format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item label={t('deposit.fields.maturityDate')} name="maturityDate" dependencies={['startDate']} rules={[{ required: true, message: t('deposit.validation.maturityDateRequired') }, ({ getFieldValue }) => ({ validator(_rule, value: Dayjs | undefined) { const start = getFieldValue('startDate') as Dayjs | undefined; if (!value || !start || value.isAfter(start, 'day')) return Promise.resolve(); return Promise.reject(new Error(t('deposit.validation.maturityAfterStart'))); } })]}>
            <DatePicker disabled={locked} className="w-full" format="DD MMM YYYY" />
          </Form.Item>
          {tenure && (
            <Alert
              className="folio-message-strip folio-message-strip-info sm:col-span-2 -mt-1 mb-2"
              showIcon
              type="info"
              title={
                <span>
                  <span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.tenure')}: </span>
                  <span className="font-mono font-semibold tabular-nums">{tenure}</span>
                </span>
              }
            />
          )}
          <Form.Item name="preClosed" valuePropName="checked" className="sm:col-span-2 mt-1 mb-0">
            <Checkbox
              disabled={fullyLocked}
              onChange={(e) => {
                if (e.target.checked && !form.getFieldValue('preClosedDate')) {
                  form.setFieldsValue({ preClosedDate: dayjs() });
                }
                if (!e.target.checked) form.setFieldsValue({ preClosedDate: undefined, preClosureCreditedValue: undefined });
              }}
            >
              {t('deposit.fields.preClosed')}
            </Checkbox>
          </Form.Item>
          {preClosed && (
            <div className="sm:col-span-2 mt-2 rounded-xl border border-folio-ink/[0.06] bg-folio-paper/40 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.preClosure')}</p>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item label={t('deposit.fields.preClosedDate')} name="preClosedDate">
                  <DatePicker disabled={fullyLocked} className="w-full" format="DD MMM YYYY" />
                </Form.Item>
                <Form.Item label={t('deposit.fields.creditedValue')} name="preClosureCreditedValue">
                  <InputNumber disabled={fullyLocked} className="w-full" min={0} precision={2} prefix="₹" placeholder={t('deposit.placeholder.creditedValue')} />
                </Form.Item>
              </div>
              {Number.isFinite(preClosureCreditedValue) && (
                <Alert
                  className="folio-message-strip folio-message-strip-warning mt-1"
                  showIcon
                  type="warning"
                  title={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.loss')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(Math.max(0, computed.realizedValue - (preClosureCreditedValue ?? 0)), { decimals: 2 })}</span></span>
                      {computed.realizedValue - (preClosureCreditedValue ?? 0) < 0 && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">{t('deposit.preClosure.noLoss')}</span>
                      )}
                    </div>
                  }
                />
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={t('deposit.section.maturity')}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="cumulativeInterest" valuePropName="checked" className="sm:col-span-2 mb-2">
            <Checkbox disabled={locked}>{t('deposit.fields.cumulativeInterest')}</Checkbox>
          </Form.Item>
          {cumulative && (
            <Form.Item label={t('deposit.fields.compounding')} name="compoundingFrequency">
              <Select disabled={locked} options={COMPOUNDING_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
            </Form.Item>
          )}
          <Form.Item label={t('deposit.fields.rollover')} name="rollover" rules={[{ required: true, message: t('deposit.validation.rolloverRequired') }]}>
            <Select disabled={locked} options={ROLLOVER_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
          </Form.Item>
          {!cumulative && (
            <Form.Item label={t('deposit.fields.payoutFrequency')} name="payoutFrequency" rules={[{ required: true, message: t('deposit.validation.payoutFrequencyRequired') }]}>
              <Select disabled={locked} options={PAYOUT_OPTIONS.map((o) => ({ value: o.value, label: `${t(o.label)}` }))} />
            </Form.Item>
          )}
        </div>
        <Alert
          className="folio-message-strip folio-message-strip-info mt-2"
          showIcon
          type="info"
          title={
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.interest')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.interest, { decimals: 2 })}</span></div>
              <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.realizedValue')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.realizedValue, { decimals: 2 })}</span></div>
              <div className="sm:col-span-2 text-[11px] text-folio-ink/45 dark:text-white/40">{t('deposit.extra.autoComputed')}</div>
            </div>
          }
        />
      </Section>

      <Form.Item label={t('deposit.fields.notes')} name="notes" className="mb-0">
        <Input.TextArea disabled={locked} rows={2} maxLength={240} placeholder={t('deposit.placeholder.notes')} />
      </Form.Item>
      <InstitutionFormModal open={createOpen} institution={null} onCancel={() => setCreateOpen(false)} onSubmit={async (values: FinancialInstitutionInput) => { const fi = await create(values); form.setFieldsValue({ financialInstitutionId: fi.id, bankName: institutionLabel(fi) }); setCreateOpen(false); void form.validateFields(['financialInstitutionId']); }} />
    </div>
  );
}
