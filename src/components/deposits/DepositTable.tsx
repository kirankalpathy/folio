import { useEffect, useState } from 'react';
import type { TableProps } from 'antd';
import { AutoComplete, Table } from 'antd';
import type { DepositHolding } from '../../types';
import { daysUntil, formatDate } from '../../utils/date';
import { calculateReturnsPercentage, formatINR, formatPercent } from '../../utils/finance';
import { getDepositLifecycleStatus } from '../../utils/deposits';
import { useI18n } from '../../i18n';
import DepositRowActions from './DepositRowActions';
import DepositStatusTag from './DepositStatusTag';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import { institutionLabel } from '../../services/financialInstitutions';
import {
  accountLabel,
  frequencyLabel,
  maturityClass,
  maturityLabel,
} from './depositTableHelpers';

interface DepositTableProps {
  deposits: DepositHolding[];
  loading: boolean;
  onEdit: (deposit: DepositHolding) => void;
  onDelete: (deposit: DepositHolding) => void;
  onView?: (deposit: DepositHolding) => void;
}

export default function DepositTable({
  deposits,
  loading,
  onEdit,
  onDelete,
  onView,
}: DepositTableProps) {
  const { t } = useI18n();
  const { institutions } = useFinancialInstitutions();
  const institutionName = (record: DepositHolding) => {
    const inst = record.financialInstitutionId ? institutions.find((fi) => fi.id === record.financialInstitutionId) : undefined;
    return inst ? institutionLabel(inst) : record.bankName;
  };
  const totalPrincipal = deposits.reduce((sum, d) => sum + (d.principal || 0), 0);
  const totalCurrentValue = deposits.reduce((sum, d) => sum + (d.currentValue || 0), 0);
  const weightedRate = totalPrincipal > 0 ? deposits.reduce((sum, d) => sum + (d.principal || 0) * (d.interestRate || 0), 0) / totalPrincipal : 0;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState('10');
  const pageSizeOptions = [5, 10, 15, 20, 25, 30, 50, 100].map((n) => ({ value: String(n), label: String(n) }));

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
  const columns: TableProps<DepositHolding>['columns'] = [
    {
      title: t('deposit.table.deposit'),
      key: 'deposit',
      render: (_, record) => (
        <div className="min-w-[190px]">
          <p className="text-sm font-medium">{record.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-folio-ink/45 dark:text-white/40">
            <span className="inline-flex rounded-full border border-folio-primary/20 bg-folio-primary/[0.06] px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.12em] text-folio-primary dark:text-folio-accent">
              {accountLabel(record.accountType, t)}
            </span>
            <span>{institutionName(record)}</span>
          </div>
        </div>
      ),
      sorter: { compare: (left, right) => left.name.localeCompare(right.name), multiple: 4 },
    },
    {
      title: t('deposit.table.status'),
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const lifecycle = getDepositLifecycleStatus(record);
        if (!lifecycle) return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
        return (
          <div className="flex justify-center">
            <DepositStatusTag status={lifecycle} />
          </div>
        );
      },
    },
    {
      title: t('deposit.table.principal'),
      dataIndex: 'principal',
      key: 'principal',
      align: 'right',
      sorter: { compare: (left, right) => left.principal - right.principal, multiple: 3 },
      render: (value: number) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-folio-ink/60 dark:text-white/50">
          {formatINR(value)}
        </span>
      ),
    },
    {
      title: t('deposit.table.currentValue'),
      dataIndex: 'currentValue',
      key: 'currentValue',
      align: 'right',
      sorter: { compare: (left, right) => left.currentValue - right.currentValue, multiple: 2 },
      render: (value: number, record) => (
        <div className="whitespace-nowrap text-right">
          <p className="font-mono text-sm font-medium tabular-nums">{formatINR(value)}</p>
          <p className="mt-0.5 font-mono text-[10px] text-folio-ink/40 dark:text-white/35">
            {formatPercent(calculateReturnsPercentage(record.principal, record.currentValue))}
          </p>
        </div>
      ),
    },
    {
      title: t('deposit.table.rate'),
      key: 'rate',
      align: 'right',
      sorter: { compare: (left, right) => left.interestRate - right.interestRate, multiple: 5 },
      render: (_, record) => (
        <div className="whitespace-nowrap text-right">
          <p className="font-mono text-xs tabular-nums">{formatPercent(record.interestRate, 2)}</p>
          <p className="mt-0.5 font-mono text-[10px] text-folio-ink/40 dark:text-white/35">
            {frequencyLabel(
              record.cumulativeInterest === false ? record.payoutFrequency : record.compoundingFrequency,
              t,
            )}
          </p>
        </div>
      ),
    },
    {
      title: t('deposit.table.maturity'),
      key: 'maturity',
      defaultSortOrder: 'descend',
      sorter: { compare: (left, right) => left.maturityDate.localeCompare(right.maturityDate), multiple: 1 },
      render: (_, record) => {
        const days = daysUntil(record.maturityDate);
        return (
          <div className="whitespace-nowrap">
            <p className="font-mono text-xs tabular-nums">{formatDate(record.maturityDate)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span
                className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${maturityClass(days)}`}
              >
                {maturityLabel(days, t)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 88,
      fixed: 'right',
      render: (_, record) => (
        <DepositRowActions deposit={record} onEdit={onEdit} onDelete={onDelete} />
      ),
    },
  ];

  return (
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
            <span className="inline-flex items-center gap-1.5 text-[12px] text-folio-ink/55 dark:text-white/50">
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
            <span className="text-[12px] text-folio-ink/55 dark:text-white/50">
              {total > 0 ? `${range[0]}-${range[1]} of ${total}` : `0 of ${total}`}
            </span>
          </>
        ),
        onChange: (page) => {
          setCurrentPage(page);
        },
      }}
      size="middle"
      scroll={{ x: 860 }}
      showSorterTooltip={{ title: t('deposit.table.sortTip') }}
      onRow={onView ? (record) => ({ onClick: () => onView(record), style: { cursor: 'pointer' } }) : undefined}
      summary={() =>
        deposits.length > 0 ? (
          <Table.Summary fixed>
            <Table.Summary.Row className="folio-table-summary-row">
              <Table.Summary.Cell index={0}>
                <div>
                  <p className="text-sm font-semibold text-folio-ink dark:text-[#F7EFE9]">{t('common.total')}</p>
                  <p className="mt-0.5 text-[11px] text-folio-ink/45 dark:text-white/40">
                    {t(deposits.length === 1 ? 'common.record.one' : 'common.record.other', { count: deposits.length })}
                  </p>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} align="right">
                <span className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums">{formatINR(totalPrincipal)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <span className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums">{formatINR(totalCurrentValue)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <span className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums">{formatPercent(weightedRate, 2)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} />
              <Table.Summary.Cell index={6} />
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
}
