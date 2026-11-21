import { useMemo, useState } from 'react';
import { Alert, App, Button, Input, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Briefcase, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import FilterMultiSelect from '../components/common/FilterMultiSelect';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ResponsiveTable from '../components/common/ResponsiveTable';
import TableLayoutControl, { useTableLayout, type TableLayoutColumnDef } from '../components/common/TableLayoutControl';
import { useI18n } from '../i18n';
import { useStockBrokers } from '../hooks/useStockBrokers';
import { usePortfolio } from '../hooks/usePortfolio';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { institutionLabel } from '../services/financialInstitutions';
import { formatINR, formatNumber } from '../utils/finance';
import { matchScore } from '../utils/search';
import { useToast } from '../components/common/toast/ToastProvider';

interface BrokerRow {
  key: string;
  id: string;
  name: string;
  nickname?: string;
  financialInstitutionId?: string;
  institutionName: string;
  accountNumber: string;
  transferAccountId?: string;
  transferAccountName: string;
  symbols: number;
  investedValue: number;
  marketValue: number;
  unrealizedGainLoss: number;
}

const BROKERS_TABLE_ID = 'stocks-brokers';

export default function StocksPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const { brokers, isLoading, error, remove } = useStockBrokers();
  const { snapshot } = usePortfolio();
  const { institutions } = useFinancialInstitutions();
  const [search, setSearch] = useState('');
  const [dematFilter, setDematFilter] = useState<string[]>([]);
  const [transferFilter, setTransferFilter] = useState<string[]>([]);

  const rows = useMemo<BrokerRow[]>(() => {
    return brokers.map((p) => {
      const holdings = snapshot.stocks.filter((s) => s.brokerId === p.id);
      const investedValue = holdings.reduce((sum, h) => sum + h.quantity * h.averageCost, 0);
      const marketValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
      const inst = p.financialInstitutionId ? institutions.find((i) => i.id === p.financialInstitutionId) : undefined;
      const transferAccount = p.transferAccountId ? institutions.find((i) => i.id === p.transferAccountId) : undefined;
      return {
        key: p.id,
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        financialInstitutionId: p.financialInstitutionId,
        institutionName: inst ? institutionLabel(inst) : '—',
        accountNumber: inst?.dematAccountNumber ?? inst?.accountNumber ?? '',
        transferAccountId: p.transferAccountId,
        transferAccountName: transferAccount ? institutionLabel(transferAccount) : '—',
        symbols: holdings.length,
        investedValue,
        marketValue,
        unrealizedGainLoss: marketValue - investedValue,
      };
    });
  }, [brokers, snapshot.stocks, institutions]);

  const dematOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows.flatMap((r) => {
      if (!r.financialInstitutionId || seen.has(r.financialInstitutionId)) return [];
      seen.add(r.financialInstitutionId);
      return [{ value: r.financialInstitutionId, label: r.institutionName }];
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const transferOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows.flatMap((r) => {
      if (!r.transferAccountId || seen.has(r.transferAccountId)) return [];
      seen.add(r.transferAccountId);
      return [{ value: r.transferAccountId, label: r.transferAccountName }];
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let base = rows;
    if (dematFilter.length > 0) base = base.filter((r) => r.financialInstitutionId && dematFilter.includes(r.financialInstitutionId));
    if (transferFilter.length > 0) base = base.filter((r) => r.transferAccountId && transferFilter.includes(r.transferAccountId));
    const q = search.trim();
    if (!q) return base;
    return base
      .map((r) => ({ row: r, score: Math.max(matchScore(q, r.name), matchScore(q, r.nickname ?? ''), matchScore(q, r.institutionName), matchScore(q, r.accountNumber), matchScore(q, r.transferAccountName)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.row);
  }, [rows, search, dematFilter, transferFilter]);

  const totals = useMemo(() => ({
    investedValue: filteredRows.reduce((s, r) => s + r.investedValue, 0),
    marketValue: filteredRows.reduce((s, r) => s + r.marketValue, 0),
    unrealizedGainLoss: filteredRows.reduce((s, r) => s + r.unrealizedGainLoss, 0),
  }), [filteredRows]);

  const columnDefs = useMemo<TableLayoutColumnDef[]>(() => [
    { key: 'name', label: t('stocks.brokers.column.name'), required: true },
    { key: 'symbols', label: t('stocks.brokers.column.symbols') },
    { key: 'investedValue', label: t('stocks.brokers.column.investedValue') },
    { key: 'marketValue', label: t('stocks.brokers.column.marketValue') },
    { key: 'unrealizedGainLoss', label: t('stocks.brokers.column.unrealizedGainLoss') },
    { key: 'actions', label: t('common.actions'), locked: true },
  ], [t]);

  const { visibleKeys, orderedKeys } = useTableLayout(BROKERS_TABLE_ID, columnDefs);

  const columns = useMemo<ColumnsType<BrokerRow>>(() => {
    const all: Record<string, ColumnsType<BrokerRow>[number]> = {
      name: {
        title: t('stocks.brokers.column.name'),
        dataIndex: 'name',
        key: 'name',
        render: (_: string, row: BrokerRow) => {
          const sub = [row.nickname, row.accountNumber].filter(Boolean).join(' • ');
          return (
            <div className="min-w-0">
              <div className="font-medium truncate">{row.name}</div>
              {sub ? <div className="truncate font-mono text-[0.6875rem] text-folio-ink/50 dark:text-white/45">{sub}</div> : null}
            </div>
          );
        },
      },
      symbols: { title: t('stocks.brokers.column.symbols'), dataIndex: 'symbols', key: 'symbols', align: 'right', render: (v: number) => <span className="folio-value">{formatNumber(v, 0)}</span> },
      investedValue: { title: t('stocks.brokers.column.investedValue'), dataIndex: 'investedValue', key: 'investedValue', align: 'right', render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      marketValue: { title: t('stocks.brokers.column.marketValue'), dataIndex: 'marketValue', key: 'marketValue', align: 'right', render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      unrealizedGainLoss: {
        title: t('stocks.brokers.column.unrealizedGainLoss'),
        dataIndex: 'unrealizedGainLoss',
        key: 'unrealizedGainLoss',
        align: 'right',
        render: (v: number) => (
          <span className={`folio-value ${v >= 0 ? 'text-folio-success-accent' : 'text-folio-error-accent'}`}>
            {formatINR(v)}
          </span>
        ),
      },
      actions: {
        title: <TableLayoutControl tableId={BROKERS_TABLE_ID} columns={columnDefs} />,
        key: 'actions',
        align: 'right',
        width: 110,
        render: (_: unknown, row: BrokerRow) => (
          <div className="flex items-center justify-end gap-1">
            <Button type="text" size="small" aria-label={t('common.edit')} icon={<Pencil size={14} />} onClick={() => navigate(`/stocks/brokers/${row.id}/edit`)} />
            <Button type="text" size="small" danger aria-label={t('common.delete')} icon={<Trash2 size={14} />} onClick={() => handleDelete(row)} />
          </div>
        ),
      },
    };
    return orderedKeys.filter((k) => visibleKeys.has(k)).map((k) => all[k]).filter(Boolean) as ColumnsType<BrokerRow>;
  }, [orderedKeys, visibleKeys, t]);

  const handleDelete = (row: BrokerRow) => {
    modal.confirm({
      title: t('stocks.brokers.deleteTitle'),
      content: t('stocks.brokers.deleteConfirm'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await remove(row.id);
          toast.success(t('common.deleted'));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t('errors.generic'));
        }
      },
    });
  };

  const brokersTab = (
    <ResponsiveTable
      filters={(
        <>
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('stocks.brokers.searchPlaceholder')}
            prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
            className="w-full min-w-0"
          />
          <FilterMultiSelect
            value={dematFilter}
            onChange={(v) => setDematFilter(v)}
            options={dematOptions}
            placeholder={t('stocks.brokers.filter.dematAccount')}
            className="w-full min-w-0"
          />
          <FilterMultiSelect
            value={transferFilter}
            onChange={(v) => setTransferFilter(v)}
            options={transferOptions}
            placeholder={t('stocks.brokers.filter.transferAccount')}
            className="w-full min-w-0"
          />
        </>
      )}
      hasFilters={search.trim().length > 0 || dematFilter.length > 0 || transferFilter.length > 0}
      onClearFilters={() => { setSearch(''); setDematFilter([]); setTransferFilter([]); }}
      title={t('stocks.tab.brokers')}
      count={filteredRows.length}
      actions={(
        <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/stocks/brokers/new')}>
          {t('common.add')}
        </Button>
      )}
    >
      {rows.length === 0 && !isLoading ? (
        <EmptyState icon={Briefcase} title={t('stocks.brokers.emptyTitle')} description={t('stocks.brokers.emptyDescription')} />
      ) : (
        <Table<BrokerRow>
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
          size="middle"
          rowKey="key"
          scroll={{ x: 'max-content' }}
          summary={() => filteredRows.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row className="folio-table-summary-row">
                {orderedKeys.filter((k) => visibleKeys.has(k)).map((k, idx) => {
                  if (k === 'name') {
                    return (
                      <Table.Summary.Cell key={k} index={idx}>
                        <div className="whitespace-nowrap">
                          <p className="text-xs font-semibold leading-5">{t('stocks.brokers.total')}</p>
                          <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                        </div>
                      </Table.Summary.Cell>
                    );
                  }
                  if (k === 'symbols') {
                    return (
                      <Table.Summary.Cell key={k} index={idx} align="right">
                        <div className="whitespace-nowrap text-right">
                          <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{formatNumber(filteredRows.reduce((s, r) => s + r.symbols, 0), 0)}</p>
                          <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                        </div>
                      </Table.Summary.Cell>
                    );
                  }
                  if (k === 'investedValue') {
                    return (
                      <Table.Summary.Cell key={k} index={idx} align="right">
                        <div className="whitespace-nowrap text-right">
                          <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{formatINR(totals.investedValue)}</p>
                          <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                        </div>
                      </Table.Summary.Cell>
                    );
                  }
                  if (k === 'marketValue') {
                    return (
                      <Table.Summary.Cell key={k} index={idx} align="right">
                        <div className="whitespace-nowrap text-right">
                          <p className="font-mono text-xs font-semibold leading-5 tabular-nums">{formatINR(totals.marketValue)}</p>
                          <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                        </div>
                      </Table.Summary.Cell>
                    );
                  }
                  if (k === 'unrealizedGainLoss') {
                    return (
                      <Table.Summary.Cell key={k} index={idx} align="right">
                        <div className="whitespace-nowrap text-right">
                          <p className={`font-mono text-xs font-semibold leading-5 tabular-nums ${totals.unrealizedGainLoss >= 0 ? 'text-folio-success-accent' : 'text-folio-error-accent'}`}>{formatINR(totals.unrealizedGainLoss)}</p>
                          <p className="mt-0.5 font-mono text-[0.625rem] leading-4">&nbsp;</p>
                        </div>
                      </Table.Summary.Cell>
                    );
                  }
                  return <Table.Summary.Cell key={k} index={idx} />;
                })}
              </Table.Summary.Row>
            </Table.Summary>
          ) : null}
        />
      )}
    </ResponsiveTable>
  );

  const holdingsTab = (
    <section className="folio-card p-5">
      <p className="text-sm text-folio-ink/60 dark:text-white/55">{t('stocks.holdings.comingSoon')}</p>
    </section>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={t('asset.stocks.label')}
        description={t('asset.stocks.description')}
      />

      {error && <Alert type="error" showIcon title={error} />}

      <Tabs
        items={[
          { key: 'brokers', label: t('stocks.tab.brokers'), children: brokersTab },
          { key: 'holdings', label: t('stocks.tab.holdings'), children: holdingsTab },
        ]}
      />
    </div>
  );
}
