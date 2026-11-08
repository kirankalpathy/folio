import type { ReactNode } from 'react';
import { Descriptions } from 'antd';
import type { DescriptionsProps } from 'antd';
import type { DepositHolding } from '../../types';
import { useI18n, type MessageKey } from '../../i18n';
import { formatDate } from '../../utils/date';
import { formatINR, formatPercent } from '../../utils/finance';
import { calculateDepositValues, formatDepositTenure, getDepositLifecycleStatus } from '../../utils/deposits';
import DepositStatusTag from './DepositStatusTag';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import { institutionLabel } from '../../services/financialInstitutions';
import { ACCOUNT_OPTIONS, COMPOUNDING_OPTIONS, NOMINEE_RELATIONSHIP_OPTIONS, PAYOUT_OPTIONS, ROLLOVER_OPTIONS } from './depositFormModel';

function val(v?: string | number | null): ReactNode {
  if (v === undefined || v === null || v === '') return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  return String(v);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-3 dark:border-white/[0.07]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{title}</h2>
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
  const computed = calculateDepositValues({
    principal: record.principal,
    interestRate: record.interestRate,
    startDate: record.startDate,
    maturityDate: record.maturityDate,
    cumulativeInterest: record.cumulativeInterest ?? false,
    compoundingFrequency: record.compoundingFrequency,
  });
  const accountOpt = ACCOUNT_OPTIONS.find((o) => o.value === record.accountType);
  const legacyAccountKeys: Partial<Record<string, MessageKey>> = { savings: 'deposit.account.savings', nsc: 'deposit.account.nsc', 'tax-saving': 'deposit.account.taxSaving' };
  const legacyKey = legacyAccountKeys[record.accountType];
  const accountText = accountOpt ? t(accountOpt.label) : legacyKey ? t(legacyKey) : record.accountType;
  const rolloverLabel = ROLLOVER_OPTIONS.find((o) => o.value === (record.rollover ?? 'none'))?.label;
  const freqLabel = (record.cumulativeInterest === false ? PAYOUT_OPTIONS : COMPOUNDING_OPTIONS)
    .find((o) => o.value === (record.cumulativeInterest === false ? record.payoutFrequency : record.compoundingFrequency))?.label;
  const dp: Partial<DescriptionsProps> = {
    layout: 'vertical', column: { xs: 1, sm: 2 }, size: 'small', colon: false, className: 'folio-desc-tight',
  };

  return (
    <div className="space-y-4 select-none">
      <Section title={t('deposit.section.overview')}>
        <Descriptions {...dp} items={[
          { key: 'lifecycle', label: t('deposit.fields.lifecycle'), children: lifecycle ? <DepositStatusTag status={lifecycle} /> : val(undefined) },
          { key: 'depositNumber', label: t('deposit.fields.depositNumber'), children: val(record.depositNumber) },
          { key: 'name', label: t('deposit.fields.name'), children: val(record.name) },
          { key: 'institution', label: t('deposit.fields.institution'), children: val(institutionName) },
          { key: 'accountType', label: t('deposit.fields.accountType'), children: val(accountText) },
          { key: 'accountNumber', label: t('deposit.fields.accountNumber'), children: val(record.accountNumber) },
        ]} />
      </Section>
      <Section title={t('deposit.section.investment')}>
        <Descriptions {...dp} items={[
          { key: 'principal', label: t('deposit.fields.principal'), children: val(formatINR(record.principal)) },
          { key: 'rate', label: t('deposit.fields.interestRate'), children: val(formatPercent(record.interestRate)) },
          { key: 'start', label: t('deposit.fields.startDate'), children: val(record.startDate ? formatDate(record.startDate) : undefined) },
          { key: 'maturity', label: t('deposit.fields.maturityDate'), children: val(record.maturityDate ? formatDate(record.maturityDate) : undefined) },
          { key: 'tenure', label: t('deposit.fields.tenure'), children: val(tenure) },
          { key: 'operationMode', label: t('deposit.fields.operationMode'), children: val(record.operationMode === 'offline' ? t('institutions.operation.offline') : t('institutions.operation.online')) },
          { key: 'markedAsLien', label: t('deposit.fields.markedAsLien'), children: val(record.markedAsLien ? t('common.yes') : t('common.no')) },
          ...(record.markedAsLien && record.lienReason ? [{ key: 'lienReason', label: t('deposit.fields.lienReason'), children: val(record.lienReason) }] : []),
          ...(record.preClosedDate ? [
            { key: 'preClosedDate', label: t('deposit.fields.preClosedDate'), children: val(formatDate(record.preClosedDate)) },
            { key: 'credited', label: t('deposit.fields.creditedValue'), children: val(record.preClosureCreditedValue != null ? formatINR(record.preClosureCreditedValue) : undefined) },
            { key: 'loss', label: t('deposit.fields.loss'), children: val(record.preClosureCreditedValue != null ? formatINR(Math.max(0, computed.realizedValue - record.preClosureCreditedValue)) : undefined) },
          ] : []),
        ]} />
      </Section>
      <Section title={t('deposit.section.maturity')}>
        <Descriptions {...dp} items={[
          { key: 'cumulative', label: t('deposit.fields.cumulativeInterest'), children: val(record.cumulativeInterest ? t('common.yes') : t('common.no')) },
          { key: 'freq', label: record.cumulativeInterest === false ? t('deposit.fields.payoutFrequency') : t('deposit.fields.compounding'), children: val(freqLabel ? t(freqLabel) : undefined) },
          { key: 'rollover', label: t('deposit.fields.rollover'), children: val(rolloverLabel ? t(rolloverLabel) : undefined) },
          { key: 'interest', label: t('deposit.fields.interest'), children: val(formatINR(computed.interest)) },
          { key: 'realized', label: t('deposit.fields.realizedValue'), children: val(formatINR(record.currentValue ?? computed.realizedValue)) },
        ]} />
      </Section>
      {(record.nominees?.length || record.notes) && (
        <Section title={t('deposit.section.additional')}>
          <div className="space-y-4">
            {record.nominees?.length ? (
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.nominees')}</h3>
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
    </div>
  );
}
