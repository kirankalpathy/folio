import { Alert, Checkbox, Form, Select } from 'antd';
import { useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import { useI18n } from '../../i18n';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues } from '../../utils/deposits';
import { PAYOUT_OPTIONS, ROLLOVER_OPTIONS, type DepositFormValues } from './depositFormModel';

export default function DepositWizardStepMaturity({ activeLocked = false, terminalLocked = false }: { activeLocked?: boolean; terminalLocked?: boolean }) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const cumulative = Form.useWatch('cumulativeInterest', form) ?? false;
  const principal = Form.useWatch('principal', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const startDate = Form.useWatch('startDate', form) as Dayjs | undefined;
  const maturityDate = Form.useWatch('maturityDate', form) as Dayjs | undefined;
  const compoundingFrequency = Form.useWatch('compoundingFrequency', form);
  const locked = terminalLocked || activeLocked;
  const required = t('validation.required');

  const computed = useMemo(
    () => calculateDepositValues({
      principal, interestRate,
      startDate: startDate?.format('YYYY-MM-DD') ?? '',
      maturityDate: maturityDate?.format('YYYY-MM-DD') ?? '',
      cumulativeInterest: cumulative, compoundingFrequency,
    }),
    [principal, interestRate, startDate, maturityDate, cumulative, compoundingFrequency],
  );

  return (
    <div className="space-y-0">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item name="cumulativeInterest" valuePropName="checked" className="sm:col-span-2 mb-2">
          <Checkbox disabled={locked} className="folio-checkbox">{t('deposit.fields.cumulativeInterest')}</Checkbox>
        </Form.Item>

        <Form.Item label={t('deposit.fields.rollover')} name="rollover" rules={[{ required: true, message: required }]}>
          <Select disabled={locked} options={ROLLOVER_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        </Form.Item>
        {!cumulative && (
          <Form.Item label={t('deposit.fields.payoutFrequency')} name="payoutFrequency" rules={[{ required: true, message: required }]}>
            <Select disabled={locked} options={PAYOUT_OPTIONS.map((o) => ({ value: o.value, label: `${t(o.label)}` }))} />
          </Form.Item>
        )}
      </div>
      <Alert
        className="folio-message-strip folio-message-strip-info mt-2"
        showIcon type="info"
        title={
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.interest')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.interest, { decimals: 2 })}</span></div>
            <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.realizedValue')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.realizedValue, { decimals: 2 })}</span></div>
            <div className="sm:col-span-2 text-[11px] text-folio-ink/45 dark:text-white/40">{t('deposit.extra.autoComputed')}</div>
          </div>
        }
      />
    </div>
  );
}
