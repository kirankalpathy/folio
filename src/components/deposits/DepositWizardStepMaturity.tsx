import { Alert, Checkbox, Form, Select } from 'antd';
import { useMemo, type ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import { Ban, Calendar, CalendarClock, CalendarDays, CalendarRange, Coins, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues } from '../../utils/deposits';
import { PAYOUT_OPTIONS, ROLLOVER_OPTIONS, type DepositFormValues } from './depositFormModel';
import type { DepositRollover, DepositPayoutFrequency } from '../../types';

const rolloverIcons: Record<DepositRollover, ReactNode> = {
  none: <Ban size={15} className="text-folio-ink/45 dark:text-white/45" />,
  principal: <RefreshCw size={15} className="text-sky-600 dark:text-sky-400" />,
  'principal-interest': <Coins size={15} className="text-emerald-600 dark:text-emerald-400" />,
};

const payoutIcons: Record<DepositPayoutFrequency, ReactNode> = {
  monthly: <CalendarDays size={15} className="text-sky-600 dark:text-sky-400" />,
  quarterly: <CalendarClock size={15} className="text-violet-600 dark:text-violet-400" />,
  'semi-annual': <CalendarRange size={15} className="text-amber-600 dark:text-amber-400" />,
  annual: <Calendar size={15} className="text-emerald-600 dark:text-emerald-400" />,
};

export default function DepositWizardStepMaturity({ activeLocked = false, terminalLocked = false }: { activeLocked?: boolean; terminalLocked?: boolean }) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const accountType = Form.useWatch('accountType', form);
  const isRd = accountType === 'rd';
  const cumulative = Form.useWatch('cumulativeInterest', form) ?? false;
  const principal = Form.useWatch('principal', form) ?? 0;
  const recurringAmount = Form.useWatch('recurringAmount', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const startDate = Form.useWatch('startDate', form) as Dayjs | undefined;
  const maturityDate = Form.useWatch('maturityDate', form) as Dayjs | undefined;
  const compoundingFrequency = Form.useWatch('compoundingFrequency', form);
  const locked = terminalLocked || activeLocked;
  const required = t('validation.required');

  const computed = useMemo(
    () => calculateDepositValues({
      accountType,
      principal,
      recurringAmount,
      interestRate,
      startDate: startDate?.format('YYYY-MM-DD') ?? '',
      maturityDate: maturityDate?.format('YYYY-MM-DD') ?? '',
      cumulativeInterest: isRd ? true : cumulative,
      compoundingFrequency,
    }),
    [accountType, principal, recurringAmount, interestRate, startDate, maturityDate, cumulative, compoundingFrequency, isRd],
  );

  return (
    <div className="space-y-0">
      <div className="grid gap-x-4 sm:grid-cols-2">
        {!isRd && (
          <Form.Item name="cumulativeInterest" valuePropName="checked" className="sm:col-span-2 mb-2">
            <Checkbox disabled={locked} className="folio-checkbox">{t('deposit.fields.cumulativeInterest')}</Checkbox>
          </Form.Item>
        )}

        <Form.Item label={t('deposit.fields.rollover')} name="rollover" required rules={[{ required: true, message: required }]}>
          <Select
            disabled={locked}
            optionLabelProp="label"
            options={ROLLOVER_OPTIONS.map((o) => {
              const text = t(o.label);
              return {
                value: o.value,
                label: text,
                search: text,
                children: <span className="inline-flex items-center gap-2">{rolloverIcons[o.value]}<span>{text}</span></span>,
              };
            })}
            optionRender={(option) => option.data.children as ReactNode}
          />
        </Form.Item>
        {!isRd && !cumulative && (
          <Form.Item label={t('deposit.fields.payoutFrequency')} name="payoutFrequency" required rules={[{ required: true, message: required }]}>
            <Select
              disabled={locked}
              optionLabelProp="label"
              options={PAYOUT_OPTIONS.map((o) => {
                const text = t(o.label);
                return {
                  value: o.value,
                  label: text,
                  search: text,
                  children: <span className="inline-flex items-center gap-2">{payoutIcons[o.value]}<span>{text}</span></span>,
                };
              })}
              optionRender={(option) => option.data.children as ReactNode}
            />
          </Form.Item>
        )}
      </div>
      <Alert
        className="folio-message-strip folio-message-strip-info mt-2"
        showIcon type="info"
        title={
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div><span className="text-folio-ink/55 dark:text-white/50">{t(isRd ? 'deposit.fields.compoundInterest' : 'deposit.fields.interest')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.interest, { decimals: 2 })}</span></div>
            <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.realizedValue')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.realizedValue, { decimals: 2 })}</span></div>
            <div className="sm:col-span-2 text-[11px] text-folio-ink/45 dark:text-white/40">{t('deposit.extra.autoComputed')}</div>
          </div>
        }
      />
    </div>
  );
}
