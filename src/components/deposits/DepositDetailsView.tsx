import type { ReactNode } from 'react';
import { Alert, Descriptions } from 'antd';
import type { DescriptionsProps } from 'antd';
import dayjs from 'dayjs';
import { Building2, User, UserCheck, UserRound, Users } from 'lucide-react';
import type { DepositHolding, DepositOperationType, DepositType } from '../../types';
import { InterestCreditAnchor } from '../../types';
import { useI18n, type MessageKey } from '../../i18n';
import { formatDate } from '../../utils/date';
import { formatINR, formatPercent } from '../../utils/finance';
import { calculateDepositValues, formatDepositTenure, getDepositLifecycleStatus } from '../../utils/deposits';
import DepositStatusTag from './DepositStatusTag';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import { institutionLabel } from '../../services/financialInstitutions';
import { ACCOUNT_OPTIONS, NOMINEE_RELATIONSHIP_OPTIONS, OPERATION_TYPE_OPTIONS, PAYOUT_OPTIONS, ROLLOVER_OPTIONS, renderDepositTypeIcon } from './depositFormModel';
import ChangeDetailsSection from '../common/ChangeDetailsSection';

function val(v?: string | number | null): ReactNode {
  if (v === undefined || v === null || v === '') return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  return <span className="break-words whitespace-normal">{String(v)}</span>;
}

function accountTypeIcon(type: DepositType): ReactNode {
  return renderDepositTypeIcon(type);
}

function operationTypeIcon(type: DepositOperationType): ReactNode {
  if (type === 'single') return <User size={15} className="text-folio-info dark:text-folio-info" />;
  if (type === 'joint') return <Users size={15} className="text-folio-info dark:text-folio-info" />;
  if (type === 'either-or-survivor') return <Users size={15} className="text-violet-600 dark:text-violet-400" />;
  return <UserCheck size={15} className="text-emerald-600 dark:text-emerald-400" />;
}

function addOpeningPeriodsLocal(base: dayjs.Dayjs, periods: number, monthsPer: number, anchorDay: number): dayjs.Dayjs {
  const targetMonth = base.month() + periods * monthsPer;
  const y = base.year() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const dim = new Date(y, m + 1, 0).getDate();
  return dayjs(new Date(y, m, Math.min(anchorDay, dim))).startOf('day');
}

function interestCreditAnchorAlertNode(record: DepositHolding, t: (key: any, params?: any) => string): ReactNode | null {
  const isRd = record.accountType === 'rd';
  if (isRd || record.cumulativeInterest !== false || !record.payoutFrequency || record.payoutFrequency === 'monthly') return null;
  const intervalText = t(record.payoutFrequency === 'quarterly'
    ? 'deposit.interestCreditAnchor.interval.quarterly'
    : record.payoutFrequency === 'semi-annual'
      ? 'deposit.interestCreditAnchor.interval.semiAnnual'
      : 'deposit.interestCreditAnchor.interval.annual');
  const anchor = record.interestCreditAnchor ?? (record.accountType === 'scss' ? InterestCreditAnchor.FinancialCalendar : InterestCreditAnchor.AccountOpeningDate);
  const start = dayjs(record.startDate).startOf('day');
  let startText = '—';
  if (anchor === InterestCreditAnchor.FinancialCalendar) {
    const boundaryMonths = record.payoutFrequency === 'quarterly' ? [2, 5, 8, 11]
      : record.payoutFrequency === 'semi-annual' ? [2, 8]
      : [2];
    const base = start.isValid() ? start : dayjs().startOf('day');
    let next: dayjs.Dayjs | null = null;
    for (let y = base.year(); y <= base.year() + 2 && !next; y++) {
      for (const m of boundaryMonths) {
        const d = dayjs(new Date(y, m + 1, 0)).startOf('day');
        if (d.isAfter(base, 'day') || d.isSame(base, 'day')) { next = d; break; }
      }
    }
    startText = next ? formatDate(next.format('YYYY-MM-DD')) : '—';
  } else if (start.isValid()) {
    const monthsPer = record.payoutFrequency === 'quarterly' ? 3 : record.payoutFrequency === 'semi-annual' ? 6 : 12;
    const firstPayout = addOpeningPeriodsLocal(start, 1, monthsPer, start.date());
    startText = formatDate(firstPayout.format('YYYY-MM-DD'));
  }
  return <>Interest will be credited every <strong>{intervalText}</strong>, starting from <strong>{startText}</strong>.</>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-3 dark:border-white/[0.07]">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function DepositDetailsView({ record }: { record: DepositHolding }) {
  const { t } = useI18n();
  const { institutions } = useFinancialInstitutions();
  const institution = record.financialInstitutionId ? institutions.find((fi) => fi.id === record.financialInstitutionId) : undefined;
  const institutionName = institution ? institutionLabel(institution) : record.bankName;
  const lifecycle = getDepositLifecycleStatus(record);
  const tenure = formatDepositTenure(record.startDate, record.maturityDate);
  const isRd = record.accountType === 'rd';
  const computed = calculateDepositValues({
    accountType: record.accountType,
    principal: record.principal,
    recurringAmount: record.recurringAmount,
    interestRate: record.interestRate,
    startDate: record.startDate,
    maturityDate: record.maturityDate,
    cumulativeInterest: isRd ? true : (record.cumulativeInterest ?? false),
    compoundingFrequency: record.compoundingFrequency,
    payoutFrequency: record.payoutFrequency,
    interestCreditAnchor: record.interestCreditAnchor,
    interestPayoutAmount: record.interestPayoutAmount,
  });
  const accountOpt = ACCOUNT_OPTIONS.find((o) => o.value === record.accountType);
  const legacyAccountKeys: Partial<Record<string, MessageKey>> = { savings: 'deposit.account.savings', nsc: 'deposit.account.nsc', 'tax-saving': 'deposit.account.taxSaving' };
  const legacyKey = legacyAccountKeys[record.accountType];
  const accountText = accountOpt ? t(accountOpt.label) : legacyKey ? t(legacyKey) : record.accountType;
  const operationType = record.operationType ?? 'single';
  const operationTypeLabel = OPERATION_TYPE_OPTIONS.find((o) => o.value === operationType)?.label;
  const rolloverLabel = ROLLOVER_OPTIONS.find((o) => o.value === (record.rollover ?? 'none'))?.label;
  const showInterestCreditAnchor = !isRd && record.cumulativeInterest === false && !!record.payoutFrequency && record.payoutFrequency !== 'monthly';
  const interestCreditAnchor = record.interestCreditAnchor ?? (record.accountType === 'scss' ? InterestCreditAnchor.FinancialCalendar : InterestCreditAnchor.AccountOpeningDate);
  const interestCreditAnchorAlert = interestCreditAnchorAlertNode(record, t as any);
  const dp: Partial<DescriptionsProps> = {
    layout: 'vertical',
    column: { xs: 1, sm: 2 },
    size: 'small',
    colon: false,
    className: 'folio-desc-tight [&_table]:!w-full [&_table]:table-fixed [&_td]:w-1/2 [&_td]:!break-words [&_td]:[overflow-wrap:anywhere]',
  };

  return (
    <div className="space-y-4 select-none">
      <Section title={t('deposit.section.overview')}>
        <Descriptions {...dp} items={[
          { key: 'depositNumber', label: t('deposit.fields.depositNumber'), children: val(record.depositNumber) },
          { key: 'name', label: t('deposit.fields.name'), children: val(record.name) },
          { key: 'lifecycle', label: t('deposit.fields.lifecycle'), children: lifecycle ? <DepositStatusTag status={lifecycle} /> : val(undefined) },
          { key: 'institution', label: t('deposit.fields.institution'), children: val(institutionName) },
          { key: 'accountType', label: t('deposit.fields.accountType'), children: <span className="inline-flex items-center gap-2">{accountTypeIcon(record.accountType)}<span>{accountText}</span></span> },
          { key: 'operationType', label: t('deposit.fields.operationType'), children: <span className="inline-flex items-center gap-2">{operationTypeIcon(operationType)}<span>{operationTypeLabel ? t(operationTypeLabel) : operationType}</span></span> },
        ]} />
        {operationType !== 'single' && record.jointHolders?.length ? (
          <div className="mt-4">
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.jointHolders')}</h3>
            <div className="space-y-2">
              {record.jointHolders.map((h, i) => (
                <div key={`${h.name}-${i}`} className="rounded-xl border border-folio-ink/[0.07] bg-folio-paper/30 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
                  <Descriptions {...dp} items={[
                    { key: 'name', label: t('deposit.fields.jointHolderName'), children: val(h.name) },
                    { key: 'dob', label: t('deposit.fields.jointHolderDob'), children: val(h.dateOfBirth ? formatDate(h.dateOfBirth) : undefined) },
                    { key: 'share', label: t('deposit.fields.jointHolderShare'), children: val(`${h.share}%`) },
                  ]} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Section>
      {record.preClosedDate ? (
        <Alert
          className="folio-message-strip folio-message-strip-warning"
          showIcon
          type="warning"
          title={
            <span>
              <span className="font-semibold">{t('deposit.fields.loss')}:</span>{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatINR(Math.max(0, computed.realizedValue - (record.preClosureCreditedValue ?? 0)), { decimals: 2 })}
              </span>
            </span>
          }
        />
      ) : null}
      <Section title={t('deposit.section.investment')}>
        <Descriptions {...dp} items={[
          isRd
            ? { key: 'recurringAmount', label: t('deposit.fields.recurringAmount'), children: val(record.recurringAmount != null ? formatINR(record.recurringAmount) : undefined) }
            : { key: 'principal', label: t('deposit.fields.principal'), children: val(formatINR(record.principal)) },
          { key: 'rate', label: t('deposit.fields.interestRate'), children: val(formatPercent(record.interestRate, 2)) },
          { key: 'start', label: t('deposit.fields.startDate'), children: val(record.startDate ? formatDate(record.startDate) : undefined) },
          { key: 'maturity', label: t('deposit.fields.maturityDate'), children: val(record.maturityDate ? formatDate(record.maturityDate) : undefined) },
          { key: 'tenure', label: t('deposit.fields.tenure'), children: val(tenure) },
          { key: 'operationMode', label: t('deposit.fields.operationMode'), children: val(record.operationMode === 'offline' ? t('institutions.operation.offline') : t('institutions.operation.online')) },
          { key: 'isPanLinked', label: t('deposit.fields.isPanLinked'), children: val(record.isPanLinked ? t('common.yes') : t('common.no')) },
          { key: 'isTaxExempt', label: t('deposit.fields.isTaxExempt'), children: val(record.isTaxExempt ? t('common.yes') : t('common.no')) },
          ...(!isRd ? [{ key: 'markedAsLien', label: t('deposit.fields.markedAsLien'), children: val(record.markedAsLien ? t('common.yes') : t('common.no')) }] : []),
          ...(!isRd && record.markedAsLien && record.lienReason ? [{ key: 'lienReason', label: t('deposit.fields.lienReason'), children: val(record.lienReason) }] : []),
          ...(record.preClosedDate ? [
            { key: 'preClosedDate', label: t('deposit.fields.preClosedDate'), children: val(formatDate(record.preClosedDate)) },
            { key: 'credited', label: t('deposit.fields.creditedValue'), children: val(record.preClosureCreditedValue != null ? formatINR(record.preClosureCreditedValue) : undefined) },
            { key: 'loss', label: t('deposit.fields.loss'), children: val(record.preClosureCreditedValue != null ? formatINR(Math.max(0, computed.realizedValue - record.preClosureCreditedValue)) : undefined) },
          ] : []),
        ]} />
      </Section>
      <Section title={t('deposit.section.maturity')}>
        {interestCreditAnchorAlert && (
          <Alert className="folio-message-strip folio-message-strip-info mb-3" showIcon type="info" title={interestCreditAnchorAlert} />
        )}
        <Descriptions {...dp} items={[
          {
            key: 'payoutMode',
            label: t('deposit.fields.payoutFrequency'),
            children: val(
              isRd || record.cumulativeInterest !== false
                ? t('deposit.payoutMode.cumulative')
                : (PAYOUT_OPTIONS.find((o) => o.value === record.payoutFrequency)?.label ? t(PAYOUT_OPTIONS.find((o) => o.value === record.payoutFrequency)!.label) : undefined),
            ),
          },
          ...(showInterestCreditAnchor ? [{
            key: 'interestCreditAnchor',
            label: t('deposit.fields.interestCreditDate'),
            children: (
              <span className="inline-flex items-center gap-2">
                {interestCreditAnchor === InterestCreditAnchor.FinancialCalendar
                  ? <Building2 size={15} className="text-violet-600 dark:text-violet-400" />
                  : <UserRound size={15} className="text-sky-600 dark:text-sky-400" />}
                <span>{t(interestCreditAnchor === InterestCreditAnchor.FinancialCalendar ? 'deposit.interestCreditAnchor.financialCalendar' : 'deposit.interestCreditAnchor.accountOpeningDate')}</span>
              </span>
            ),
          }] : []),
          { key: 'rollover', label: t('deposit.fields.rollover'), children: val(rolloverLabel ? t(rolloverLabel) : undefined) },
          {
            key: 'interest',
            label: t(isRd ? 'deposit.fields.compoundInterest' : 'deposit.fields.interest'),
            children: (() => {
              const payoutsPerYear = record.payoutFrequency
                ? ({ monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 } as const)[record.payoutFrequency]
                : undefined;
              const payoutAmount = computed.interestPayoutAmount ?? (
                !isRd && record.cumulativeInterest === false && payoutsPerYear
                  ? (record.principal * record.interestRate) / 100 / payoutsPerYear
                  : undefined
              );
              const freqText = record.payoutFrequency === 'monthly' ? t('deposit.frequency.short.monthly')
                : record.payoutFrequency === 'quarterly' ? t('deposit.frequency.short.quarterly')
                : record.payoutFrequency === 'semi-annual' ? t('deposit.frequency.short.semiAnnual')
                : record.payoutFrequency === 'annual' ? t('deposit.frequency.short.annual')
                : '';
              const showPayoutCredit = !isRd && record.cumulativeInterest === false && payoutAmount != null && Number.isFinite(payoutAmount) && !!record.payoutFrequency;
              return (
                <div>
                  {showPayoutCredit ? (
                    <>
                      <span className="break-words whitespace-normal font-medium">
                        {t('deposit.interestCredit', { frequency: freqText, amount: formatINR(payoutAmount, { decimals: 2 }) })}
                      </span>
                      <div className="mt-1 text-[0.75rem] text-folio-primary dark:text-folio-accent">
                        {t('deposit.fields.totalInterestAccrued')}: {formatINR(computed.interest, { decimals: 2 })}
                      </div>
                    </>
                  ) : (
                    <span className="break-words whitespace-normal">{formatINR(computed.interest)}</span>
                  )}
                </div>
              );
            })(),
          },
          { key: 'realized', label: t('deposit.fields.realizedValue'), children: val(formatINR(!isRd && record.cumulativeInterest === false ? computed.realizedValue : (record.currentValue ?? computed.realizedValue))) },
        ]} />
      </Section>
      {(record.nominees?.length || record.notes) && (
        <Section title={t('deposit.section.additional')}>
          <div className="space-y-4">
            {record.nominees?.length ? (
              <div>
                <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.nominees')}</h3>
                <div className="space-y-2">
                  {record.nominees.map((n, i) => {
                    const rel = NOMINEE_RELATIONSHIP_OPTIONS.find((o) => o.value === n.relationship);
                    return (
                      <div key={`${n.name}-${i}`} className="rounded-xl border border-folio-ink/[0.07] bg-folio-paper/30 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
                        <Descriptions {...dp} items={[
                          { key: 'name', label: t('deposit.fields.nomineeName'), children: val(n.name) },
                          { key: 'rel', label: t('deposit.fields.nomineeRelationship'), children: val(rel ? t(rel.label) : n.relationship) },
                          { key: 'dob', label: t('deposit.fields.nomineeDob'), children: val(n.dateOfBirth ? formatDate(n.dateOfBirth) : undefined) },
                          { key: 'share', label: t('deposit.fields.nomineeShare'), children: val(`${n.share}%`) },
                        ]} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {record.notes ? (
              <Descriptions {...dp} column={1} items={[{ key: 'notes', label: t('deposit.fields.notes'), children: val(record.notes) }]} />
            ) : null}
          </div>
        </Section>
      )}
      <ChangeDetailsSection record={record} descriptionsProps={dp} />
    </div>
  );
}
