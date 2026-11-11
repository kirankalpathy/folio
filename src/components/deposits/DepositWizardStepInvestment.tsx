import { Alert, Checkbox, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Globe, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { getDateFormatId } from '../../utils/date';
import { DATE_PICKER_MIN, isDateOutsidePickerBounds } from '../../config/validationConfig';
import { formatINR, formatNumber, getNumberFormat } from '../../utils/finance';
import { calculateDepositValues, DepositLifecycleStatus, formatDepositTenure } from '../../utils/deposits';
import {
  InterestPayoutOption,
  deriveCumulativeInterest,
  derivePeriodicPayoutFrequency,
  type DepositFormValues,
} from './depositFormModel';
import DepositStatusTag from './DepositStatusTag';

function parseFormattedNumber(input: string): number {
  const raw = (input ?? '').trim();
  if (!raw) return NaN;
  const cfg = getNumberFormat();
  const group = cfg.group === '\u00A0' ? /\s|\u00A0/g : new RegExp(`\\${cfg.group}`, 'g');
  const normalized = raw.replace(group, '').replace(cfg.decimal, '.').replace(/[^0-9.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function isDateOutOfRange(date: Dayjs): boolean {
  return isDateOutsidePickerBounds(date);
}

function isPreClosedDateDisabled(date: Dayjs): boolean {
  return date.isBefore(DATE_PICKER_MIN, 'day') || date.isAfter(dayjs(), 'day');
}

function boldStatus(template: string, statusLabel: string): ReactNode {
  const parts = template.split('{status}');
  if (parts.length === 1) return template;
  return <>{parts[0]}<strong>{statusLabel}</strong>{parts[1]}</>;
}

export default function DepositWizardStepInvestment({
  activeLocked = false,
  terminalLocked = false,
  lienEditable: _lienEditable = false,
  isEdit = false,
}: {
  activeLocked?: boolean;
  terminalLocked?: boolean;
  lienEditable?: boolean;
  isEdit?: boolean;
}) {
  void _lienEditable;
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const accountType = Form.useWatch('accountType', form);
  const isRd = accountType === 'rd';
  const principal = Form.useWatch('principal', form) ?? 0;
  const recurringAmount = Form.useWatch('recurringAmount', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const startDate = Form.useWatch('startDate', form) as Dayjs | undefined;
  const maturityDate = Form.useWatch('maturityDate', form) as Dayjs | undefined;
  const compoundingFrequency = Form.useWatch('compoundingFrequency', form);
  const interestPayoutOption = (Form.useWatch('interestPayoutOption', form) ?? InterestPayoutOption.Cumulative) as InterestPayoutOption;
  const cumulative = deriveCumulativeInterest(accountType, interestPayoutOption);
  const payoutFrequency = derivePeriodicPayoutFrequency(accountType, interestPayoutOption);
  const preClosed = Form.useWatch('preClosed', form) ?? false;
  const preClosureCreditedValue = Form.useWatch('preClosureCreditedValue', form);
  const markedAsLien = Form.useWatch('markedAsLien', form) ?? false;
  const isPanLinked = Form.useWatch('isPanLinked', form) ?? true;
  const isTaxExempt = Form.useWatch('isTaxExempt', form) ?? false;
  const fullyLocked = terminalLocked;
  const locked = fullyLocked || activeLocked;
  const lienLocked = fullyLocked;
  const dateFormat = getDateFormatId();
  const [focusedNumber, setFocusedNumber] = useState<'principal' | 'rate' | 'recurringAmount' | null>(null);
  const required = t('validation.required');
  const isPlanned = startDate?.isValid() ? startDate.isAfter(dayjs().startOf('day')) : false;
  const showPreClosure = isEdit && !activeLocked && !isPlanned;

  useEffect(() => {
    if (isRd) {
      form.setFieldsValue({
        markedAsLien: false,
        lienReason: '',
        interestPayoutOption: InterestPayoutOption.Cumulative,
        cumulativeInterest: true,
        payoutFrequency: 'annual',
      } as Partial<DepositFormValues>);
    }
  }, [isRd, form]);

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
      payoutFrequency,
    }),
    [accountType, principal, recurringAmount, interestRate, startDate, maturityDate, cumulative, compoundingFrequency, payoutFrequency, isRd],
  );
  const tenure = formatDepositTenure(startDate?.format('YYYY-MM-DD'), maturityDate?.format('YYYY-MM-DD'));

  const statusInfo = useMemo((): { status: DepositLifecycleStatus; message: ReactNode } | null => {
    if (!startDate?.isValid() || !maturityDate?.isValid()) return null;
    if (!isRd && markedAsLien) {
      const label = t('deposit.lifecycle.inLien');
      return { status: DepositLifecycleStatus.InLien, message: boldStatus(t('deposit.status.message.inLien'), label) };
    }
    if (isEdit && preClosed) {
      const label = t('deposit.lifecycle.preClosed');
      return { status: DepositLifecycleStatus.PreClosed, message: boldStatus(t('deposit.status.message.preClosed'), label) };
    }
    const today = dayjs().startOf('day');
    if (maturityDate.isBefore(today, 'day')) {
      const label = t('deposit.lifecycle.matured');
      return { status: DepositLifecycleStatus.Matured, message: boldStatus(t('deposit.status.message.matured'), label) };
    }
    if (startDate.isAfter(today, 'day')) {
      const label = t('deposit.lifecycle.planned');
      return { status: DepositLifecycleStatus.Planned, message: boldStatus(t('deposit.status.message.planned'), label) };
    }
    const label = t('deposit.lifecycle.active');
    return { status: DepositLifecycleStatus.Active, message: boldStatus(t('deposit.status.message.active'), label) };
  }, [startDate, maturityDate, preClosed, isEdit, markedAsLien, isRd, t]);

  const amountFormatter = (field: 'principal' | 'recurringAmount') => (value: unknown, info?: { input?: string }) => {
    if (focusedNumber === field) return info?.input ?? (value == null ? '' : String(value));
    const v = value as number | string | undefined | null;
    if (v === undefined || v === null || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return '';
    return formatNumber(Math.round(n * 100) / 100, 2);
  };
  const amountParser = ((value?: string) => {
    const n = parseFormattedNumber(value ?? '');
    if (!Number.isFinite(n)) return '' as unknown as 0;
    return Math.round(n * 100) / 100;
  }) as unknown as (displayValue: string | undefined) => 0;

  return (
    <div className="grid gap-x-4 sm:grid-cols-2">
      {isRd ? (
        <Form.Item
          label={t('deposit.fields.recurringAmount')}
          name="recurringAmount"
          required
          rules={[
            { required: true, message: required },
            { type: 'number', min: 0.01, message: t('deposit.validation.recurringAmountMin') },
          ]}
        >
          <InputNumber
            disabled={locked}
            className="!w-full"
            style={{ width: '100%' }}
            min={0}
            controls={false}
            inputMode="decimal"
            addonBefore="₹"
            placeholder={t('deposit.placeholder.recurringAmount')}
            formatter={amountFormatter('recurringAmount')}
            parser={amountParser}
            onFocus={() => setFocusedNumber('recurringAmount')}
            onBlur={() => setFocusedNumber(null)}
          />
        </Form.Item>
      ) : (
        <Form.Item
          label={t('deposit.fields.principal')}
          name="principal"
          required
          rules={[
            { required: true, message: required },
            { type: 'number', min: 1000.01, message: t('deposit.validation.principalMin') },
          ]}
        >
          <InputNumber
            disabled={locked}
            className="!w-full"
            style={{ width: '100%' }}
            min={0}
            controls={false}
            inputMode="decimal"
            addonBefore="₹"
            placeholder={t('deposit.placeholder.principal')}
            formatter={amountFormatter('principal')}
            parser={amountParser}
            onFocus={() => setFocusedNumber('principal')}
            onBlur={() => setFocusedNumber(null)}
          />
        </Form.Item>
      )}
      <Form.Item
        label={t('deposit.fields.interestRate')}
        name="interestRate"
        required
        rules={[
          { required: true, message: required },
          { type: 'number', min: 1.0001, message: t('deposit.validation.rateMin') },
        ]}
      >
        <InputNumber
          disabled={locked}
          className="!w-full"
          style={{ width: '100%' }}
          min={0}
          max={100}
          step={0.01}
          controls={false}
          inputMode="decimal"
          addonAfter={t('deposit.suffix.rate')}
          placeholder={t('deposit.placeholder.rate')}
          formatter={(value, info) => {
            if (focusedNumber === 'rate') return info?.input ?? (value == null ? '' : String(value));
            const v = value as number | string | undefined | null;
            if (v === undefined || v === null || v === '') return '';
            const n = Number(v);
            if (!Number.isFinite(n) || n === 0) return '';
            return formatNumber(Math.round(n * 100) / 100, 2);
          }}
          parser={amountParser}
          onFocus={() => setFocusedNumber('rate')}
          onBlur={() => setFocusedNumber(null)}
        />
      </Form.Item>
      <Form.Item
        label={t('deposit.fields.startDate')}
        name="startDate"
        required
        rules={[
          { required: true, message: required },
          { validator: async (_, value?: Dayjs) => { if (!value || !isDateOutOfRange(value)) return; throw new Error(t('deposit.validation.dateRange')); } },
        ]}
      >
        <DatePicker disabled={locked} className="w-full" format={dateFormat} disabledDate={isDateOutOfRange} />
      </Form.Item>
      <Form.Item
        label={t('deposit.fields.maturityDate')}
        name="maturityDate"
        required
        dependencies={['startDate']}
        rules={[
          { required: true, message: required },
          { validator: async (_, value?: Dayjs) => { if (!value || !isDateOutOfRange(value)) return; throw new Error(t('deposit.validation.dateRange')); } },
          ({ getFieldValue }) => ({
            validator(_rule, value: Dayjs | undefined) {
              const start = getFieldValue('startDate') as Dayjs | undefined;
              if (!value || !start || value.isAfter(start, 'day')) return Promise.resolve();
              return Promise.reject(new Error(t('deposit.validation.maturityAfterStart')));
            },
          }),
        ]}
      >
        <DatePicker disabled={locked} className="w-full" format={dateFormat} disabledDate={isDateOutOfRange} />
      </Form.Item>
      {(tenure || statusInfo) && (
        <Alert
          className="folio-message-strip folio-message-strip-info sm:col-span-2 -mt-1 mb-2"
          showIcon type="info"
          title={
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                {tenure && <span><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.tenure')}: </span><span className="font-mono font-semibold tabular-nums">{tenure}</span></span>}
                {statusInfo && <span className="inline-flex items-center gap-1.5"><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.lifecycle')}:</span><DepositStatusTag status={statusInfo.status} /></span>}
              </div>
              {statusInfo && <div className="text-[11px] text-folio-ink/60 dark:text-white/55">{statusInfo.message}</div>}
            </div>
          }
        />
      )}
      <Form.Item label={t('deposit.fields.operationMode')} name="operationMode" initialValue="online" required rules={[{ required: true, message: required }]} className="mb-1">
        <Select
          disabled={locked}
          optionLabelProp="label"
          options={[
            { value: 'online', label: <span className="inline-flex items-center gap-2"><Globe size={15} className="text-sky-600 dark:text-sky-400" /><span>{t('institutions.operation.online')}</span></span> },
            { value: 'offline', label: <span className="inline-flex items-center gap-2"><WifiOff size={15} className="text-folio-ink/55 dark:text-white/50" /><span>{t('institutions.operation.offline')}</span></span> },
          ]}
        />
      </Form.Item>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-1 pt-6 mb-3">
        <Form.Item name="isPanLinked" valuePropName="checked" className="mb-0">
          <Checkbox className="folio-checkbox" disabled={fullyLocked}>{t('deposit.fields.isPanLinked')}</Checkbox>
        </Form.Item>
        <Form.Item name="isTaxExempt" valuePropName="checked" className="mb-0">
          <Checkbox className="folio-checkbox" disabled={fullyLocked}>{t('deposit.fields.isTaxExempt')}</Checkbox>
        </Form.Item>
      </div>
      {(!isPanLinked || !isTaxExempt) && (
        <Alert
          className="folio-message-strip folio-message-strip-warning sm:col-span-2 mt-3 mb-2"
          showIcon
          type="warning"
          title={
            <ul className="m-0 list-disc space-y-1 pl-5">
              {!isTaxExempt ? (
                <li>
                  Your financial institution will deduct tax at source <strong>(TDS)</strong>. Either submit necessary documentation for tax exemption or review the TDS statement with the institution.
                </li>
              ) : null}
              {!isPanLinked ? (
                <li>
                  In case PAN Card is not linked to a deposit, it may attract <strong>higher tax slabs</strong>. Please verify with your financial institution.
                </li>
              ) : null}
            </ul>
          }
        />
      )}
      {!isRd && (
        <>
          <Form.Item name="markedAsLien" valuePropName="checked" className="sm:col-span-2 mb-0">
            <Checkbox
              className="folio-checkbox"
              disabled={lienLocked}
              onChange={(e) => {
                if (!e.target.checked) form.setFieldsValue({ lienReason: '' });
                else void form.validateFields(['lienReason']).catch(() => undefined);
              }}
            >
              {t('deposit.fields.markedAsLien')}
            </Checkbox>
          </Form.Item>
          {markedAsLien && (
            <Form.Item
              label={t('deposit.fields.lienReason')}
              name="lienReason"
              required
              className="sm:col-span-2"
              rules={[{ required: true, whitespace: true, message: t('deposit.validation.lienReasonRequired') }]}
            >
              <Input disabled={lienLocked} maxLength={200} />
            </Form.Item>
          )}
        </>
      )}
      {showPreClosure && (
        <Form.Item name="preClosed" valuePropName="checked" className="sm:col-span-2 mt-1 mb-0">
          <Checkbox
            className="folio-checkbox"
            disabled={fullyLocked || activeLocked}
            onChange={(e) => {
              if (e.target.checked && !form.getFieldValue('preClosedDate')) form.setFieldsValue({ preClosedDate: dayjs() });
              if (!e.target.checked) form.setFieldsValue({ preClosedDate: undefined, preClosureCreditedValue: undefined });
            }}
          >{t('deposit.fields.preClosed')}</Checkbox>
        </Form.Item>
      )}
      {showPreClosure && preClosed && (
        <div className="sm:col-span-2 mt-2 rounded-xl border border-folio-ink/[0.06] bg-folio-paper/40 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.preClosure')}</p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              label={t('deposit.fields.preClosedDate')}
              name="preClosedDate"
              rules={[
                { required: true, message: required },
                { validator: async (_, value?: Dayjs) => { if (!value || !value.isAfter(dayjs(), 'day')) return; throw new Error(t('deposit.validation.preClosedDateNotFuture')); } },
              ]}
            >
              <DatePicker disabled={fullyLocked || activeLocked} className="w-full" format={dateFormat} disabledDate={isPreClosedDateDisabled} />
            </Form.Item>
            <Form.Item label={t('deposit.fields.creditedValue')} name="preClosureCreditedValue" rules={[{ required: true, message: required }]}><InputNumber disabled={fullyLocked || activeLocked} className="w-full" min={0} precision={2} prefix="₹" placeholder={t('deposit.placeholder.creditedValue')} /></Form.Item>
          </div>
          {Number.isFinite(preClosureCreditedValue) && (
            <Alert className="folio-message-strip folio-message-strip-warning mt-1" showIcon type="warning" title={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span><span className="text-folio-ink/55 dark:text-white/50">{t('deposit.fields.loss')}: </span><span className="font-mono font-semibold tabular-nums">{formatINR(Math.max(0, computed.realizedValue - (preClosureCreditedValue ?? 0)), { decimals: 2 })}</span></span>
                {computed.realizedValue - (preClosureCreditedValue ?? 0) < 0 && <span className="text-[11px] text-emerald-700 dark:text-emerald-400">{t('deposit.preClosure.noLoss')}</span>}
              </div>
            } />
          )}
        </div>
      )}
    </div>
  );
}
