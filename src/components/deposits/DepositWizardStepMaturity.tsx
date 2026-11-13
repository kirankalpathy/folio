import { Alert, Checkbox, DatePicker, Form, Select, Tooltip } from 'antd';
import AmountInputNumber from '../common/AmountInputNumber';
import { useEffect, useMemo, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Ban, Calendar, CalendarClock, CalendarDays, CalendarRange, Coins, RefreshCw, TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n';
import { getDateFormatId } from '../../utils/date';
import { DATE_PICKER_MIN } from '../../config/validationConfig';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues } from '../../utils/deposits';
import {
  INTEREST_PAYOUT_OPTIONS,
  InterestPayoutOption,
  ROLLOVER_OPTIONS,
  deriveCumulativeInterest,
  derivePeriodicPayoutFrequency,
  isScssAccountType,
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

function isPreClosedDateDisabled(date: Dayjs): boolean {
  return date.isBefore(DATE_PICKER_MIN, 'day') || date.isAfter(dayjs(), 'day');
}

export default function DepositWizardStepMaturity({
  activeLocked = false,
  terminalLocked = false,
  allowPreClosure = false,
  isEdit = false,
}: {
  activeLocked?: boolean;
  terminalLocked?: boolean;
  allowPreClosure?: boolean;
  isEdit?: boolean;
}) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const accountType = Form.useWatch('accountType', form);
  const isRd = accountType === 'rd';
  const isScss = isScssAccountType(accountType);
  const interestPayoutOption = (Form.useWatch('interestPayoutOption', form) ?? InterestPayoutOption.Cumulative) as InterestPayoutOption;
  const cumulative = deriveCumulativeInterest(accountType, interestPayoutOption);
  const periodicPayoutFrequency = derivePeriodicPayoutFrequency(accountType, interestPayoutOption);
  const principal = Form.useWatch('principal', form) ?? 0;
  const recurringAmount = Form.useWatch('recurringAmount', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const startDate = Form.useWatch('startDate', form) as Dayjs | undefined;
  const maturityDate = Form.useWatch('maturityDate', form) as Dayjs | undefined;
  const compoundingFrequency = Form.useWatch('compoundingFrequency', form);
  const preClosed = Form.useWatch('preClosed', form) ?? false;
  const preClosureCreditedValue = Form.useWatch('preClosureCreditedValue', form);
  const locked = terminalLocked || activeLocked;
  const required = t('validation.required');
  const dateFormat = getDateFormatId();
  const isPlanned = startDate?.isValid() ? startDate.isAfter(dayjs().startOf('day')) : false;
  const showPreClosure = isEdit && !terminalLocked && !isPlanned && (!activeLocked || allowPreClosure);
  const preClosureEditable = showPreClosure && (!activeLocked || allowPreClosure);

  useEffect(() => {
    if (!isScss) return;
    form.setFieldsValue({
      interestPayoutOption: InterestPayoutOption.Quarterly,
      cumulativeInterest: false,
      payoutFrequency: 'quarterly',
      rollover: 'none',
    } as Partial<DepositFormValues>);
  }, [isScss, form]);

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
          isScss ? (
            <Tooltip title={t('deposit.scss.payoutFrequencyHint')}>
              <div className="sm:col-span-2">
                <Form.Item
                  label={t('deposit.fields.payoutFrequency')}
                  name="interestPayoutOption"
                  required
                  rules={[{ required: true, message: required }]}
                  className="sm:col-span-2"
                >
                  <Select
                    disabled
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
                  />
                </Form.Item>
              </div>
            </Tooltip>
          ) : (
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
          )
        )}
        {isRd && <Form.Item name="interestPayoutOption" hidden initialValue={InterestPayoutOption.Cumulative}><input type="hidden" /></Form.Item>}

        {!isScss ? (
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
        ) : (
          <Form.Item name="rollover" hidden initialValue="none"><input type="hidden" /></Form.Item>
        )}
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

      {showPreClosure && (
        <Form.Item name="preClosed" valuePropName="checked" className="sm:col-span-2 mt-4 mb-0">
          <Checkbox
            className="folio-checkbox"
            disabled={terminalLocked || !preClosureEditable}
            onChange={(e) => {
              if (e.target.checked && !form.getFieldValue('preClosedDate')) form.setFieldsValue({ preClosedDate: dayjs() });
              if (!e.target.checked) form.setFieldsValue({ preClosedDate: undefined, preClosureCreditedValue: undefined });
            }}
          >{t('deposit.fields.preClosed')}</Checkbox>
        </Form.Item>
      )}
      {showPreClosure && preClosed && (
        <div className="sm:col-span-2 mt-2 rounded-xl border border-folio-ink/[0.06] bg-folio-paper/40 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.preClosure')}</p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              label={t('deposit.fields.preClosedDate')}
              name="preClosedDate"
              rules={[
                { required: true, message: required },
                { validator: async (_, value?: Dayjs) => { if (!value || !value.isAfter(dayjs(), 'day')) return; throw new Error(t('deposit.validation.preClosedDateNotFuture')); } },
              ]}
            >
              <DatePicker disabled={terminalLocked || !preClosureEditable} className="w-full" format={dateFormat} disabledDate={isPreClosedDateDisabled} />
            </Form.Item>
            <Form.Item
              label={t('deposit.fields.creditedValue')}
              name="preClosureCreditedValue"
              rules={[
                { required: true, message: required },
                {
                  validator: async (_, value?: number) => {
                    if (value == null || !Number.isFinite(value)) return;
                    if (value > computed.realizedValue) throw new Error(t('deposit.validation.preClosureCreditedMax'));
                  },
                },
              ]}
            >
              <AmountInputNumber disabled={terminalLocked || !preClosureEditable} className="!w-full" min={0} precision={2} prefix="₹" placeholder={t('deposit.placeholder.creditedValue')} />
            </Form.Item>
          </div>
          {Number.isFinite(preClosureCreditedValue) && (
            <Alert className="folio-message-strip folio-message-strip-warning mt-1" showIcon type="warning" title={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.loss')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(Math.max(0, computed.realizedValue - (preClosureCreditedValue ?? 0)), { decimals: 2 })}</span></span>
                {computed.realizedValue - (preClosureCreditedValue ?? 0) < 0 && <span className="text-[0.6875rem] text-emerald-700 dark:text-emerald-400">{t('deposit.preClosure.noLoss')}</span>}
              </div>
            } />
          )}
        </div>
      )}
    </div>
  );
}
