import type { TableProps } from 'antd';
import { Table } from 'antd';
import type { AssetClassMeta } from '../../config/assetClasses';
import type { LedgerRow } from '../../utils/ledger';
import { useI18n } from '../../i18n';
import { formatINR } from '../../utils/finance';

interface LedgerTableProps {
  rows: LedgerRow[];
  meta: AssetClassMeta;
}

export default function LedgerTable({ rows, meta }: LedgerTableProps) {
  const { t } = useI18n();
  const columns: TableProps<LedgerRow>['columns'] = [
    {
      title: t('ledger.table.holding'),
      key: 'holding',
      render: (_, row) => (
        <div className="min-w-[180px]">
          <p className="text-sm font-medium">{row.title}</p>
          <p className="mt-0.5 text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{row.subtitle}</p>
          <span className="mt-1.5 inline-flex rounded-full border border-folio-primary/20 bg-folio-primary/[0.06] px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-folio-primary dark:text-folio-accent">
            {row.tag}
          </span>
        </div>
      ),
    },
    {
      title: t('ledger.table.position'),
      dataIndex: 'position',
      key: 'position',
      render: (value: string) => (
        <span className="whitespace-nowrap font-mono text-xs text-folio-ink/60 dark:text-white/50">
          {value}
        </span>
      ),
    },
    {
      title: t(meta.valueLabel),
      dataIndex: 'value',
      key: 'value',
      align: 'right',
      render: (value: number) => (
        <span className="whitespace-nowrap font-mono text-sm font-medium tabular-nums">
          {formatINR(value)}
        </span>
      ),
    },
    {
      title: t(meta.costLabel),
      dataIndex: 'reference',
      key: 'reference',
      align: 'right',
      render: (value: number) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-folio-ink/55 dark:text-white/45">
          {formatINR(value)}
        </span>
      ),
    },
    {
      title: t('ledger.table.detail'),
      dataIndex: 'detail',
      key: 'detail',
      render: (value: string) => (
        <span className="whitespace-nowrap text-xs text-folio-ink/50 dark:text-white/40">{value}</span>
      ),
    },
  ];

  return (
    <Table<LedgerRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      pagination={false}
      size="middle"
      scroll={{ x: 820 }}
    />
  );
}
