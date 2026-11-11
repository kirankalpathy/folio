import { Alert, Form, Select } from 'antd';
import { useMemo, type ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import { Ban, Calendar, CalendarClock, CalendarDays, CalendarRange, Coins, RefreshCw, TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues } from '../../utils/deposits';
import {
  INTEREST_PAYOUT_OPTIONS,
  InterestPayoutOption,
  ROLLOVER_OPTIONS,
  deriveCumulativeInterest,
  derivePeriodicPayoutFrequency,
  type DepositFormValues,
} from './depositFormModel';
import type { DepositRollover } from '../../types';

const rolloverIcons: Record<DepositRollover, ReactNode> = {
  none: <Ban size={15} className="text-folio-ink/45 dark:text-white/45" />,
  principal: <RefreshCw size={15} className="text-sky-600 dark:text-sky-400" />,
  'principal-interest': <Coins size={15} className="text-emerald-600 dark:text-emerald-400" />,
};

const payoutOptionIcons: Record<InterestPayoutOption, ReactNode> = {
  cumulative: <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />,
  monthly: <CalendarDays size={15} className="text-sky-600 dark:text-sky-400" />,
  quarterly: <CalendarClock size={15} className="text-violet-600 dark:text-violet-400" />,
  'semi-annual': <CalendarRange size={15} className="text-amber-600 dark:text-amber-400" />,
  annual: <Calendar size={15} className="text-folio-ink/60 dark:text-white/60" />,
};

function shortFrequencyLabel(t: (key: 'deposit.frequency.short.monthly' | 'deposit.frequency.short.quarterly' | 'deposit.frequency.short.semiAnnual' | 'deposit.frequency.short.annual') => string, opt: InterestPayoutOption | undefined): string {
  if (!opt || opt === InterestPayoutOption.Cumulative) return '';
  if (opt === InterestPayoutOption.Monthly) return t('deposit.frequency.short.monthly');
  if (opt === InterestPayoutOption.Quarterly) return t('deposit.frequency.short.quarterly');
  if (opt === InterestPayoutOption.SemiAnnual) return t('deposit.frequency.short.semiAnnual');
  return t('deposit.frequency.short.annual');
}

export default function DepositWizardStepMaturity({ activeLocked = false, terminalLocked = false }: { activeLocked?: boolean; terminalLocked?: boolean }) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const accountType = Form.useWatch('accountType', form);
  const isRd = accountType === 'rd';
  const interestPayoutOption = (Form.useWatch('interestPayoutOption', form) ?? InterestPayoutOption.Cumulative) as InterestPayoutOption;
  const cumulative = deriveCumulativeInterest(accountType, interestPayoutOption);
  const periodicPayoutFrequency = derivePeriodicPayoutFrequency(accountType, interestPayoutOption);
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
      payoutFrequency: periodicPayoutFrequency,
    }),
    [accountType, principal, recurringAmount, interestRate, startDate, maturityDate, cumulative, compoundingFrequency, periodicPayoutFrequency, isRd],
  );
  const payoutFrequencyText = shortFrequencyLabel(t, interestPayoutOption);

  return (
    <div className="space-y-0">
      <div className="grid gap-x-4 sm:grid-cols-2">
        {!isRd && (
          <Form.Item
            label={t('deposit.fields.payoutFrequency')}
            name="interestPayoutOption"
            required
            rules={[{ required: true, message: required }]}
            className="sm:col-span-2"
          >
            <Select
              disabled={locked}
              optionLabelProp="label"
              options={INTEREST_PAYOUT_OPTIONS.map((o) => {
                const text = t(o.label);
                return {
                  value: o.value,
                  label: text,
                  search: text,
                  children: <span className="inline-flex items-center gap-2">{payoutOptionIcons[o.value]}<span>{text}</span></span>,
                };
              })}
              optionRender={(option) => option.data.children as ReactNode}
              onChange={(value) => {
                const isCumulative = deriveCumulativeInterest(accountType, value as InterestPayoutOption);
                form.setFieldsValue({
                  cumulativeInterest: isCumulative,
                  payoutFrequency: derivePeriodicPayoutFrequency(accountType, value as InterestPayoutOption) ?? 'annual',
                });
              }}
            />
          </Form.Item>
        )}
        {isRd && <Form.Item name="interestPayoutOption" hidden initialValue={InterestPayoutOption.Cumulative}><input type="hidden" /></Form.Item>}

        <Form.Item label={t('deposit.fields.rollover')} name="rollover" required rules={[{ required: true, message: required }]} className={!isRd ? 'sm:col-span-2' : undefined}>
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
      </div>
      <Alert
        className="folio-message-strip folio-message-strip-info mt-2"
        showIcon type="info"
        title={
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div>
              {!isRd && !cumulative && computed.interestPayoutAmount != null && periodicPayoutFrequency ? (
                <>
                  <span className="text-folio-ink/55 dark:text-white/50">{t('deposit.interestCredit', { frequency: payoutFrequencyText, amount: formatINR(computed.interestPayoutAmount, { decimals: 2 }) }).split(':')[0]}: </span>
                  <span className="font-mono font-semibold tabular-nums">{formatINR(computed.interestPayoutAmount, { decimals: 2 })}</span>
                  <div className="mt-0.5 text-[0.75rem] text-folio-ink/70 dark:text-white/65">
                    {t('deposit.fields.totalInterestAccrued')}: {formatINR(computed.interest, { decimals: 2 })}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-folio-ink/55 dark:text-white/50">{t(isRd ? 'deposit.fields.compoundInterest' : 'deposit.fields.interest')}: </span>
                  <span className="font-mono font-semibold tabular-nums">{formatINR(computed.interest, { decimals: 2 })}</span>
                </>
              )}
            </div>
            <div><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.realizedValue')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(computed.realizedValue, { decimals: 2 })}</span></div>
            <div className="sm:col-span-2 text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{t('deposit.extra.autoComputed')}</div>
          </div>
        }
      />
    </div>
  );
}
