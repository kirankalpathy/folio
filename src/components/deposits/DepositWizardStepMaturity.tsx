import { Alert, Checkbox, DatePicker, Form, Select, Tooltip } from 'antd';
import AmountInputNumber from '../common/AmountInputNumber';
import { useEffect, useMemo, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Ban, Building2, Calendar, CalendarClock, CalendarDays, CalendarRange, Coins, RefreshCw, TrendingUp, UserRound } from 'lucide-react';
import { useI18n } from '../../i18n';
import { InterestCreditAnchor } from '../../types';
import { getDateFormatId, formatDate } from '../../utils/date';
import { DATE_PICKER_MIN } from '../../config/validationConfig';
import { formatINR } from '../../utils/finance';
import { calculateDepositValues } from '../../utils/deposits';
import {
  INTEREST_CREDIT_ANCHOR_OPTIONS,
  INTEREST_PAYOUT_OPTIONS,
  InterestPayoutOption,
  ROLLOVER_OPTIONS,
  deriveCumulativeInterest,
  derivePeriodicPayoutFrequency,
  isScssAccountType,
  showInterestCreditAnchorOption,
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

const creditAnchorIcons: Record<InterestCreditAnchor, ReactNode> = {
  [InterestCreditAnchor.AccountOpeningDate]: <UserRound size={15} className="text-sky-600 dark:text-sky-400" />,
  [InterestCreditAnchor.FinancialCalendar]: <Building2 size={15} className="text-violet-600 dark:text-violet-400" />,
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

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

function addOpeningPeriodsLocal(base: Dayjs, periods: number, monthsPer: number, anchorDay: number): Dayjs {
  const targetMonth = base.month() + periods * monthsPer;
  const y = base.year() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const dim = new Date(y, m + 1, 0).getDate();
  return dayjs(new Date(y, m, Math.min(anchorDay, dim))).startOf('day');
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
  const interestCreditAnchor = (Form.useWatch('interestCreditAnchor', form) ?? InterestCreditAnchor.AccountOpeningDate) as InterestCreditAnchor;
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
      interestCreditAnchor: InterestCreditAnchor.FinancialCalendar,
      rollover: 'none',
    } as Partial<DepositFormValues>);
  }, [isScss, form]);

  useEffect(() => {
    if (isRd || isScss) return;
    if (!showInterestCreditAnchorOption(interestPayoutOption)) return;
    // Ensure a sensible default when switching into a non-monthly periodic payout
    const current = form.getFieldValue('interestCreditAnchor') as InterestCreditAnchor | undefined;
    if (current !== InterestCreditAnchor.AccountOpeningDate && current !== InterestCreditAnchor.FinancialCalendar) {
      form.setFieldValue('interestCreditAnchor', InterestCreditAnchor.AccountOpeningDate);
    }
  }, [interestPayoutOption, isRd, isScss, form]);

  const interestPayoutAmount = Form.useWatch('interestPayoutAmount', form) as number | undefined;

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
      interestCreditAnchor,
      interestPayoutAmount,
    }),
    [accountType, principal, recurringAmount, interestRate, startDate, maturityDate, cumulative, compoundingFrequency, periodicPayoutFrequency, interestCreditAnchor, interestPayoutAmount, isRd],
  );
  const payoutFrequencyText = shortFrequencyLabel(t, interestPayoutOption);
  const showInterestCreditAnchor = !isRd && !cumulative && showInterestCreditAnchorOption(interestPayoutOption);

  const interestCreditAnchorAlert = useMemo((): ReactNode => {
    if (!showInterestCreditAnchor) return null;
    const intervalText = t(interestPayoutOption === InterestPayoutOption.Quarterly
      ? 'deposit.interestCreditAnchor.interval.quarterly'
      : interestPayoutOption === InterestPayoutOption.SemiAnnual
        ? 'deposit.interestCreditAnchor.interval.semiAnnual'
        : 'deposit.interestCreditAnchor.interval.annual');
    if (interestCreditAnchor === InterestCreditAnchor.FinancialCalendar) {
      // Next financial-calendar anchor date (on/after start)
      const boundaryMonths = interestPayoutOption === InterestPayoutOption.Quarterly ? [2, 5, 8, 11]
        : interestPayoutOption === InterestPayoutOption.SemiAnnual ? [2, 8]
        : [2]; // annual: Mar 31
      const base = startDate?.isValid() ? startDate.startOf('day') : dayjs().startOf('day');
      const fromYear = base.year();
      let next: Dayjs | null = null;
      for (let y = fromYear; y <= fromYear + 2 && !next; y++) {
        for (const m of boundaryMonths) {
          const d = dayjs(new Date(y, m + 1, 0)).startOf('day');
          if (d.isAfter(base, 'day') || d.isSame(base, 'day')) { next = d; break; }
        }
      }
      const startText = next ? formatDate(next.format('YYYY-MM-DD')) : '—';
      return <>Interest will be credited every <strong>{intervalText}</strong>, starting from <strong>{startText}</strong>.</>;
    }
    // Account opening date
    if (!startDate?.isValid()) {
      return <>Interest will be credited every <strong>{intervalText}</strong>, starting from <strong>—</strong>.</>;
    }
    if (interestPayoutOption === InterestPayoutOption.Monthly) {
      const dayText = ordinalDay(startDate.date());
      return t('deposit.interestCreditAnchor.alert.openingDate.monthly', { day: dayText });
    }
    const monthsPer = interestPayoutOption === InterestPayoutOption.Quarterly ? 3 : interestPayoutOption === InterestPayoutOption.SemiAnnual ? 6 : 12;
    const firstPayout = addOpeningPeriodsLocal(startDate.startOf('day'), 1, monthsPer, startDate.date());
    const startText = formatDate(firstPayout.format('YYYY-MM-DD'));
    return <>Interest will be credited every <strong>{intervalText}</strong>, starting from <strong>{startText}</strong>.</>;
  }, [showInterestCreditAnchor, interestCreditAnchor, interestPayoutOption, startDate, t]);

  return (
    <div className="space-y-0">
      <div className="grid gap-x-4 sm:grid-cols-2">
        {!isRd && (
          isScss ? (
            <div className="sm:col-span-2">
              <Tooltip title={t('deposit.scss.payoutFrequencyHint')}>
                <div>
                  <Form.Item
                    label={t('deposit.fields.payoutFrequency')}
                    name="interestPayoutOption"
                    required
                    rules={[{ required: true, message: required }]}
                    className="mb-3"
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
              {showInterestCreditAnchor && (
                <>
                  <Tooltip title={t('deposit.scss.interestCreditAnchorHint')}>
                    <div>
                      <Form.Item
                        label={t('deposit.fields.interestCreditDate')}
                        name="interestCreditAnchor"
                        required
                        rules={[{ required: true, message: required }]}
                        className="mb-2"
                      >
                        <Select
                          disabled
                          options={INTEREST_CREDIT_ANCHOR_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
                        />
                      </Form.Item>
                    </div>
                  </Tooltip>
                  {interestCreditAnchorAlert && (
                    <Alert className="folio-message-strip folio-message-strip-info mb-2" showIcon type="info" title={interestCreditAnchorAlert} />
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <Form.Item
                label={t('deposit.fields.payoutFrequency')}
                name="interestPayoutOption"
                required
                rules={[{ required: true, message: required }]}
                className={showInterestCreditAnchor ? 'sm:col-span-1 mb-3' : 'sm:col-span-2 mb-3'}
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
                    const opt = value as InterestPayoutOption;
                    const isCumulative = deriveCumulativeInterest(accountType, opt);
                    form.setFieldsValue({
                      cumulativeInterest: isCumulative,
                      payoutFrequency: derivePeriodicPayoutFrequency(accountType, opt) ?? 'annual',
                      ...(showInterestCreditAnchorOption(opt) ? { interestCreditAnchor: form.getFieldValue('interestCreditAnchor') ?? InterestCreditAnchor.AccountOpeningDate } : {}),
                    });
                  }}
                />
              </Form.Item>
              {showInterestCreditAnchor && (
                <>
                  <Form.Item
                    label={t('deposit.fields.interestCreditDate')}
                    name="interestCreditAnchor"
                    required
                    rules={[{ required: true, message: required }]}
                    className="sm:col-span-1 mb-2"
                  >
                    <Select
                      disabled={locked}
                      optionLabelProp="label"
                      options={INTEREST_CREDIT_ANCHOR_OPTIONS.map((o) => {
                        const text = t(o.label);
                        return { value: o.value, label: text, children: <span className="inline-flex items-center gap-2">{creditAnchorIcons[o.value]}<span>{text}</span></span> };
                      })}
                      optionRender={(option) => option.data.children as ReactNode}
                    />
                  </Form.Item>
                  {interestCreditAnchorAlert && (
                    <Alert className="folio-message-strip folio-message-strip-info sm:col-span-2 mb-2" showIcon type="info" title={interestCreditAnchorAlert} />
                  )}
                </>
              )}
            </>
          )
        )}
        {isRd && <Form.Item name="interestPayoutOption" hidden initialValue={InterestPayoutOption.Cumulative}><input type="hidden" /></Form.Item>}
        {isRd && <Form.Item name="interestCreditAnchor" hidden initialValue={InterestCreditAnchor.AccountOpeningDate}><input type="hidden" /></Form.Item>}

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
