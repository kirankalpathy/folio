import { useEffect, useMemo, useRef, useState } from 'react';
import type { TableProps } from 'antd';
import { AutoComplete, Table, Tag } from 'antd';
import type { DepositHolding } from '../../types';
import { daysUntil, formatDate } from '../../utils/date';
import { formatINR, formatPercent } from '../../utils/finance';
import { getDepositDerivedValues, getDepositLifecycleStatus } from '../../utils/deposits';
import { useI18n } from '../../i18n';
import TruncatedText from '../common/TruncatedText';
import TableLayoutControl, { useTableLayout, type TableLayoutColumnDef } from '../common/TableLayoutControl';
import DepositRowActions from './DepositRowActions';
import DepositStatusTag, { FOLIO_TAG_CLASS } from './DepositStatusTag';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import { institutionLabel } from '../../services/financialInstitutions';
import {
  accountLabel,
  accountTypeTagStyle,
  frequencyLabel,
  maturityClass,
  maturityLabel,
} from './depositTableHelpers';
import { COMPOUNDING_OPTIONS, OPERATION_TYPE_OPTIONS, ROLLOVER_OPTIONS, toInterestPayoutOption } from './depositFormModel';

interface DepositTableProps {
  deposits: DepositHolding[];
  loading: boolean;
  onEdit: (deposit: DepositHolding) => void;
  onDelete: (deposit: DepositHolding) => void;
  onView?: (deposit: DepositHolding) => void;
  variant?: 'active' | 'closed';
}

const TABLE_ID = 'deposits-summary';

export default function DepositTable({
  deposits,
  loading,
  onEdit,
  onDelete,
  onView,
  variant = 'active',
}: DepositTableProps) {
  const { t } = useI18n();
  const maturityColumnLabel = variant === 'closed' ? t('deposit.table.closureDate') : t('deposit.table.maturityDate');
  const { institutions } = useFinancialInstitutions();
  const institutionName = (record: DepositHolding) => {
    const inst = record.financialInstitutionId ? institutions.find((fi) => fi.id === record.financialInstitutionId) : undefined;
    return inst ? institutionLabel(inst) : record.bankName;
  };
  const boolText = (v: boolean | undefined) => (v ? t('common.yes') : t('common.no'));
  const dash = <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  const rowComputed = useMemo(
    () =>
      deposits.map((d) => {
        const derived = getDepositDerivedValues(d);
        return { deposit: d, derived };
      }),
    [deposits],
  );
  const totalPrincipal = useMemo(() => deposits.reduce((sum, d) => sum + (d.principal || 0), 0), [deposits]);
  const totalProjectedValue = useMemo(() => rowComputed.reduce((sum, r) => sum + r.derived.totalReturns, 0), [rowComputed]);
  const totalRealizedGain = useMemo(() => rowComputed.reduce((sum, r) => sum + r.derived.realizedGain, 0), [rowComputed]);
  const totalUnrealizedGain = useMemo(() => rowComputed.reduce((sum, r) => sum + r.derived.unrealizedGain, 0), [rowComputed]);
  const weightedRate = useMemo(
    () => (totalPrincipal > 0 ? deposits.reduce((sum, d) => sum + (d.principal || 0) * (d.interestRate || 0), 0) / totalPrincipal : 0),
    [deposits, totalPrincipal],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState('10');
  const pageSizeOptions = [5, 10, 15, 20, 25, 30, 50, 100].map((n) => ({ value: String(n), label: String(n) }));
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const scrollTableLeft = () => {
    const el = tableWrapRef.current?.querySelector<HTMLElement>('.ant-table-content, .ant-table-body, .ant-table-container');
    if (el) el.scrollLeft = 0;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [deposits]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const commitPageSize = (raw: string) => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      setPageSizeInput(String(pageSize));
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 1) {
      setPageSizeInput(String(pageSize));
      return;
    }
    const clamped = Math.min(100, n);
    setPageSize(clamped);
    setPageSizeInput(String(clamped));
    setCurrentPage(1);
  };

  const columnDefs = useMemo<TableLayoutColumnDef[]>(
    () => [
      { key: 'deposit', label: t('deposit.table.deposit'), defaultVisible: true, required: true },
      { key: 'depositNumber', label: t('deposit.table.depositNumber'), defaultVisible: false },
      { key: 'name', label: t('deposit.table.name'), defaultVisible: false },
      { key: 'institution', label: t('deposit.table.institution'), defaultVisible: false },
      { key: 'accountType', label: t('deposit.table.accountType'), defaultVisible: false },
      { key: 'operationType', label: t('deposit.table.operationType'), defaultVisible: false },
      { key: 'operationMode', label: t('deposit.table.operationMode'), defaultVisible: false },
      { key: 'status', label: t('deposit.table.status'), defaultVisible: true },
      { key: 'principal', label: t('deposit.table.principal'), defaultVisible: true },
      { key: 'interest', label: t('deposit.table.interest'), defaultVisible: true },
      { key: 'realizedGain', label: t('deposit.table.realizedGain'), defaultVisible: true },
      { key: 'unrealizedGain', label: t('deposit.table.unrealizedGain'), defaultVisible: true },
      { key: 'currentValue', label: t('deposit.table.currentValue'), defaultVisible: true },
      { key: 'recurringAmount', label: t('deposit.table.recurringAmount'), defaultVisible: false },
      { key: 'interestRate', label: t('deposit.table.interestRate'), defaultVisible: false },
      { key: 'rate', label: t('deposit.table.rate'), defaultVisible: true },
      { key: 'interestPayout', label: t('deposit.table.interestPayout'), defaultVisible: false },
      { key: 'compoundingFrequency', label: t('deposit.table.compoundingFrequency'), defaultVisible: false },
      { key: 'rollover', label: t('deposit.table.rollover'), defaultVisible: false },
      { key: 'startDate', label: t('deposit.table.startDate'), defaultVisible: false },
      { key: 'maturity', label: maturityColumnLabel, defaultVisible: true },
      { key: 'panLinked', label: t('deposit.table.panLinked'), defaultVisible: false },
      { key: 'taxExempt', label: t('deposit.table.taxExempt'), defaultVisible: false },
      { key: 'lien', label: t('deposit.table.lien'), defaultVisible: false },
      { key: 'notes', label: t('deposit.table.notes'), defaultVisible: false },
      { key: 'actions', label: '', locked: true },
    ],
    [t, maturityColumnLabel],
  );

  const { layout } = useTableLayout(TABLE_ID, columnDefs);

  const allColumns = useMemo<Record<string, NonNullable<TableProps<DepositHolding>['columns']>[number]>>(
    () => ({
      deposit: {
        title: t('deposit.table.deposit'),
        key: 'deposit',
        render: (_, record) => (
          <div className="min-w-[190px]">
            <p className="text-sm font-medium">
              <TruncatedText text={record.name} maxLength={30} block className="max-w-[220px]" />
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-folio-ink/45 dark:text-white/40">
              <Tag bordered={false} style={accountTypeTagStyle(record.accountType)} className={FOLIO_TAG_CLASS}>
                {accountLabel(record.accountType, t)}
              </Tag>
              <span className="min-w-0 flex-1">
                <TruncatedText text={institutionName(record)} maxLength={30} block className="max-w-[180px]" />
              </span>
            </div>
          </div>
        ),
        sorter: { compare: (left, right) => left.name.localeCompare(right.name), multiple: 4 },
      },
      depositNumber: { title: t('deposit.table.depositNumber'), key: 'depositNumber', render: (_, r) => <span className="font-mono text-xs">{r.depositNumber || dash}</span> },
      name: { title: t('deposit.table.name'), key: 'name', render: (_, r) => <TruncatedText text={r.name} maxLength={30} block className="max-w-[220px]" /> },
      institution: { title: t('deposit.table.institution'), key: 'institution', render: (_, r) => <TruncatedText text={institutionName(r)} maxLength={30} block className="max-w-[220px]" /> },
      accountType: { title: t('deposit.table.accountType'), key: 'accountType', render: (_, r) => accountLabel(r.accountType, t) },
      operationType: {
        title: t('deposit.table.operationType'),
        key: 'operationType',
        render: (_, r) => {
          const op = r.operationType ?? 'single';
          return t(OPERATION_TYPE_OPTIONS.find((o) => o.value === op)?.label ?? 'deposit.operationType.single');
        },
      },
      operationMode: { title: t('deposit.table.operationMode'), key: 'operationMode', render: (_, r) => t(r.operationMode === 'offline' ? 'institutions.operation.offline' : 'institutions.operation.online') },
      status: {
        title: t('deposit.table.status'),
        key: 'status',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const lifecycle = getDepositLifecycleStatus(record);
          if (!lifecycle) return dash;
          return (
            <div className="flex justify-center">
              <DepositStatusTag status={lifecycle} />
            </div>
          );
        },
      },
      principal: {
        title: t('deposit.table.principal'),
        dataIndex: 'principal',
        key: 'principal',
        align: 'right',
        sorter: { compare: (left, right) => left.principal - right.principal, multiple: 3 },
        render: (value: number) => (
          <div className="whitespace-nowrap text-right">
            <p className="font-mono text-xs leading-5 tabular-nums text-folio-ink/60 dark:text-white/50">{formatINR(value)}</p>
            <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
          </div>
        ),
      },
      interest: {
        title: t('deposit.table.interest'),
        key: 'interest',
        align: 'right',
        sorter: {
          compare: (left, right) => {
            const li = getDepositDerivedValues(left).totalInterest;
            const ri = getDepositDerivedValues(right).totalInterest;
            return li - ri;
          },
          multiple: 4,
        },
        render: (_, record) => {
          const isRd = record.accountType === 'rd';
          const derived = rowComputed.find((r) => r.deposit.id === record.id)?.derived ?? getDepositDerivedValues(record);
          const payoutOption = toInterestPayoutOption(record);
          const isCumulative = payoutOption === 'cumulative' || isRd;
          let subtext = t('deposit.payoutMode.cumulative');
          const payoutAmount = isRd || (record.cumulativeInterest ?? false) || !record.payoutFrequency
            ? undefined
            : (() => {
                const payoutsPerYear = record.payoutFrequency === 'monthly' ? 12 : record.payoutFrequency === 'quarterly' ? 4 : record.payoutFrequency === 'semi-annual' ? 2 : 1;
                return (record.principal * record.interestRate) / 100 / payoutsPerYear;
              })();
          if (!isCumulative && payoutAmount != null) {
            const amt = formatINR(payoutAmount);
            if (payoutOption === 'monthly') subtext = t('deposit.interestSubtext.monthly', { amount: amt });
            else if (payoutOption === 'quarterly') subtext = t('deposit.interestSubtext.quarterly', { amount: amt });
            else if (payoutOption === 'semi-annual') subtext = t('deposit.interestSubtext.semiAnnual', { amount: amt });
            else if (payoutOption === 'annual') subtext = t('deposit.interestSubtext.annual', { amount: amt });
          }
          return (
            <div className="whitespace-nowrap text-right">
              <p className="font-mono text-xs leading-5 tabular-nums text-folio-ink/70 dark:text-white/60">{formatINR(derived.totalInterest)}</p>
              <p className="mt-0.5 font-mono text-[0.625rem] leading-4 font-semibold tabular-nums text-folio-ink/40 dark:text-white/35">{subtext}</p>
            </div>
          );
        },
      },
      realizedGain: {
        title: t('deposit.table.realizedGain'),
        key: 'realizedGain',
        align: 'right',
        sorter: {
          compare: (left, right) => {
            const l = getDepositDerivedValues(left).realizedGain;
            const r = getDepositDerivedValues(right).realizedGain;
            return l - r;
          },
          multiple: 2,
        },
        render: (_, record) => {
          const value = rowComputed.find((r) => r.deposit.id === record.id)?.derived.realizedGain ?? getDepositDerivedValues(record).realizedGain;
          return (
            <div className="whitespace-nowrap text-right">
              <p className="font-mono text-xs font-medium leading-5 tabular-nums text-folio-info-accent">{formatINR(value)}</p>
              <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
            </div>
          );
        },
      },
      unrealizedGain: {
        title: t('deposit.table.unrealizedGain'),
        key: 'unrealizedGain',
        align: 'right',
        sorter: {
          compare: (left, right) => getDepositDerivedValues(left).unrealizedGain - getDepositDerivedValues(right).unrealizedGain,
          multiple: 2,
        },
        render: (_, record) => {
          const value = rowComputed.find((r) => r.deposit.id === record.id)?.derived.unrealizedGain ?? getDepositDerivedValues(record).unrealizedGain;
          return (
            <div className="whitespace-nowrap text-right">
              <p className="font-mono text-xs font-medium leading-5 tabular-nums text-folio-success-accent">{formatINR(value)}</p>
              <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
            </div>
          );
        },
      },
      currentValue: {
        title: t('deposit.table.currentValue'),
        key: 'currentValue',
        align: 'right',
        sorter: {
          compare: (left, right) => getDepositDerivedValues(left).totalReturns - getDepositDerivedValues(right).totalReturns,
          multiple: 2,
        },
        render: (_, record) => {
          const value = rowComputed.find((r) => r.deposit.id === record.id)?.derived.totalReturns ?? getDepositDerivedValues(record).totalReturns;
          return (
            <div className="whitespace-nowrap text-right">
              <p className="font-mono text-sm font-medium leading-5 tabular-nums">{formatINR(value)}</p>
              <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
            </div>
          );
        },
      },
      recurringAmount: {
        title: t('deposit.table.recurringAmount'),
        key: 'recurringAmount',
        align: 'right',
        render: (_, r) => (
          <div className="whitespace-nowrap text-right">
            <p className="font-mono text-xs leading-5 tabular-nums">{r.recurringAmount != null ? formatINR(r.recurringAmount) : dash}</p>
            <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
          </div>
        ),
      },
      interestRate: {
        title: t('deposit.table.interestRate'),
        key: 'interestRate',
        align: 'right',
        render: (_, r) => (
          <div className="whitespace-nowrap text-right">
            <p className="font-mono text-xs leading-5 tabular-nums">{formatPercent(r.interestRate, 2)}</p>
            <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
          </div>
        ),
      },
      rate: {
        title: t('deposit.table.rate'),
        key: 'rate',
        align: 'right',
        sorter: { compare: (left, right) => left.interestRate - right.interestRate, multiple: 5 },
        render: (_, record) => (
          <div className="whitespace-nowrap text-right">
            <p className="font-mono text-xs leading-5 tabular-nums">{formatPercent(record.interestRate, 2)}</p>
            <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
          </div>
        ),
      },
      interestPayout: {
        title: t('deposit.table.interestPayout'),
        key: 'interestPayout',
        render: (_, r) => {
          const opt = toInterestPayoutOption(r);
          if (opt === 'cumulative') return t('deposit.payoutMode.cumulative');
          return frequencyLabel(r.payoutFrequency ?? opt, t);
        },
      },
      compoundingFrequency: {
        title: t('deposit.table.compoundingFrequency'),
        key: 'compoundingFrequency',
        render: (_, r) => frequencyLabel(r.compoundingFrequency, t) || (COMPOUNDING_OPTIONS.find((o) => o.value === r.compoundingFrequency) ? t(COMPOUNDING_OPTIONS.find((o) => o.value === r.compoundingFrequency)!.label) : dash),
      },
      rollover: {
        title: t('deposit.table.rollover'),
        key: 'rollover',
        render: (_, r) => {
          const ro = r.rollover ?? 'none';
          return t(ROLLOVER_OPTIONS.find((o) => o.value === ro)?.label ?? 'deposit.rollover.none');
        },
      },
      startDate: {
        title: t('deposit.table.startDate'),
        key: 'startDate',
        render: (_, r) => (
          <div className="whitespace-nowrap">
            <p className="font-mono text-xs leading-5 tabular-nums">{r.startDate ? formatDate(r.startDate) : dash}</p>
            <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
          </div>
        ),
      },
      maturity: {
        title: maturityColumnLabel,
        key: 'maturity',
        defaultSortOrder: 'descend',
        sorter: {
          compare: (left, right) => {
            const leftDate = variant === 'closed' ? (left.preClosedDate || left.maturityDate || '') : (left.maturityDate || '');
            const rightDate = variant === 'closed' ? (right.preClosedDate || right.maturityDate || '') : (right.maturityDate || '');
            return leftDate.localeCompare(rightDate);
          },
          multiple: 1,
        },
        render: (_, record) => {
          const dateValue = variant === 'closed' ? (record.preClosedDate || record.maturityDate) : record.maturityDate;
          if (!dateValue) return dash;
          const days = daysUntil(dateValue);
          return (
            <div className="whitespace-nowrap">
              <p className="font-mono text-xs leading-5 tabular-nums">{formatDate(dateValue)}</p>
              <div className="mt-0.5 flex min-h-4 flex-wrap items-center gap-1">
                <span
                  className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[0.5625rem] leading-4 ${maturityClass(days)}`}
                >
                  {maturityLabel(dateValue, t)}
                </span>
              </div>
            </div>
          );
        },
      },
      panLinked: { title: t('deposit.table.panLinked'), key: 'panLinked', render: (_, r) => boolText(r.isPanLinked) },
      taxExempt: { title: t('deposit.table.taxExempt'), key: 'taxExempt', render: (_, r) => boolText(r.isTaxExempt) },
      lien: { title: t('deposit.table.lien'), key: 'lien', render: (_, r) => boolText(r.markedAsLien) },
      notes: { title: t('deposit.table.notes'), key: 'notes', render: (_, r) => r.notes ? <TruncatedText text={r.notes} maxLength={40} block className="max-w-[220px] text-xs" /> : dash },
      actions: {
        title: <TableLayoutControl tableId={TABLE_ID} columns={columnDefs} onReset={scrollTableLeft} />,
        key: 'actions',
        align: 'right',
        width: 112,
        fixed: 'right',
        render: (_, record) => (
          <DepositRowActions deposit={record} onEdit={onEdit} onDelete={onDelete} />
        ),
      },
    }),
    [t, institutions, onEdit, onDelete, columnDefs],
  );

  const columns = useMemo<TableProps<DepositHolding>['columns']>(() => {
    const ordered = layout
      .filter((c) => c.visible && allColumns[c.key])
      .map((c) => allColumns[c.key]!);
    // Ensure actions stays last and visible.
    if (!ordered.some((c) => c.key === 'actions') && allColumns.actions) ordered.push(allColumns.actions);
    const actionsIdx = ordered.findIndex((c) => c.key === 'actions');
    if (actionsIdx >= 0 && actionsIdx !== ordered.length - 1) {
      const [a] = ordered.splice(actionsIdx, 1);
      if (a) ordered.push(a);
    }
    return ordered;
  }, [layout, allColumns]);

  const summaryKeys = useMemo(() => (columns ?? []).map((c) => String(c.key ?? '')), [columns]);

  return (
    <div ref={tableWrapRef}>
      <Table<DepositHolding>
      rowKey="id"
      columns={columns}
      dataSource={deposits}
      loading={loading}
      pagination={{
        current: currentPage,
        pageSize,
        showSizeChanger: false,
        align: 'center',
        showTotal: (total, range) => (
          <>
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-folio-ink/55 dark:text-white/50">
              <AutoComplete
                size="small"
                value={pageSizeInput}
                options={pageSizeOptions}
                onSelect={(value) => commitPageSize(value)}
                onChange={(value) => setPageSizeInput(value.replace(/[^\d]/g, ''))}
                onBlur={() => commitPageSize(pageSizeInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitPageSize(pageSizeInput);
                    (e.currentTarget as HTMLElement).blur();
                  }
                }}
                style={{ width: 64 }}
                popupMatchSelectWidth={64}
                filterOption={(input, option) => (option?.value ?? '').includes(input)}
              />
              <span>items</span>
            </span>
            <span className="text-[0.75rem] text-folio-ink/55 dark:text-white/50">
              {total > 0 ? `${range[0]}-${range[1]} of ${total}` : `0 of ${total}`}
            </span>
          </>
        ),
        onChange: (page) => {
          setCurrentPage(page);
        },
      }}
      size="middle"
      scroll={{ x: 'max-content' }}
      showSorterTooltip={{ title: t('deposit.table.sortTip') }}
      onRow={onView ? (record) => ({ onClick: () => onView(record), style: { cursor: 'pointer' } }) : undefined}
      summary={() =>
        deposits.length > 0 ? (
          <Table.Summary fixed>
            <Table.Summary.Row className="folio-table-summary-row">
              {summaryKeys.map((key, idx) => {
                if (key === 'principal') {
                  return (
                    <Table.Summary.Cell key={key} index={idx} align="right">
                      <div className="whitespace-nowrap text-right">
                        <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{formatINR(totalPrincipal)}</p>
                        <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                if (key === 'realizedGain') {
                  return (
                    <Table.Summary.Cell key={key} index={idx} align="right">
                      <div className="whitespace-nowrap text-right">
                        <p className="font-mono text-xs font-semibold leading-5 tabular-nums text-folio-info-accent">{formatINR(totalRealizedGain)}</p>
                        <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                if (key === 'unrealizedGain') {
                  return (
                    <Table.Summary.Cell key={key} index={idx} align="right">
                      <div className="whitespace-nowrap text-right">
                        <p className="font-mono text-xs font-semibold leading-5 tabular-nums text-folio-success-accent">{formatINR(totalUnrealizedGain)}</p>
                        <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                if (key === 'currentValue') {
                  return (
                    <Table.Summary.Cell key={key} index={idx} align="right">
                      <div className="whitespace-nowrap text-right">
                        <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{formatINR(totalProjectedValue)}</p>
                        <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                if (key === 'rate' || key === 'interestRate') {
                  return (
                    <Table.Summary.Cell key={key} index={idx} align="right">
                      <div className="whitespace-nowrap text-right">
                        <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{key === 'rate' || key === 'interestRate' ? formatPercent(weightedRate, 2) : ''}</p>
                        <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                if (idx === 0) {
                  return (
                    <Table.Summary.Cell key={key} index={idx}>
                      <div>
                        <p className="text-sm font-semibold text-folio-ink dark:text-folio-cream">{t('common.total')}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-folio-ink/45 dark:text-white/40">
                          {t(deposits.length === 1 ? 'common.record.one' : 'common.record.other', { count: deposits.length })}
                        </p>
                      </div>
                    </Table.Summary.Cell>
                  );
                }
                return <Table.Summary.Cell key={`${key}-${idx}`} index={idx} />;
              })}
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
      />
    </div>
  );
}
