import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Checkbox, Divider, Input, Modal, Select, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Briefcase, Database, Pencil, PieChart, Plus, RefreshCw, Search, ShieldAlert, Tags, Trash2, TrendingUp, Users, Wallet } from 'lucide-react';
import FilterMultiSelect from '../components/common/FilterMultiSelect';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import TruncatedText from '../components/common/TruncatedText';
import EmptyState from '../components/common/EmptyState';
import ResponsiveTable from '../components/common/ResponsiveTable';
import StockBrokerFormModal from '../components/stocks/StockBrokerFormModal';
import TableLayoutControl, { useTableLayout, type TableLayoutColumnDef } from '../components/common/TableLayoutControl';
import StatCard from '../components/common/StatCard';
import { useI18n } from '../i18n';
import { useStockBrokers } from '../hooks/useStockBrokers';
import { useStockHoldings } from '../hooks/useStockHoldings';
import { useStockCategories } from '../hooks/useStockCategories';
import { usePortfolio } from '../hooks/usePortfolio';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { institutionLabel } from '../services/financialInstitutions';
import { formatINR, formatNumber } from '../utils/finance';
import { formatDateTime } from '../utils/date';
import { numberSorter, stringSorter } from '../utils/tableSort';
import { matchScore } from '../utils/search';
import { useToast } from '../components/common/toast/ToastProvider';
import { useBusyIndicator } from '../components/common/BusyIndicator';
import { refreshNseSymbolMaster } from '../services/symbolMaster';
import { getSymbolMasterStats, searchSymbolMaster, type SymbolMasterStats, type SymbolMasterSearchResult } from '../services/sqlite';
import { StockCategoryType, STOCK_CATEGORY_TYPE_LABELS, SymbolExchange } from '../types';
import { STOCK_CATEGORY_TYPE_META, STOCK_CATEGORY_TYPE_OPTIONS } from '../config/stockCategoryTypes';
import { SYMBOL_EXCHANGE_META, SYMBOL_EXCHANGE_OPTIONS } from '../config/symbolExchanges';
import { useTablePagination } from '../hooks/useTablePagination';
import { useTableSort } from '../hooks/useTableSort';

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
  const { holdings, isLoading: holdingsLoading, error: holdingsError, create: createHolding, update: updateHolding, remove: removeHolding } = useStockHoldings();
  const { categories, isLoading: categoriesLoading, error: categoriesError, create: createCategory, update: updateCategory, remove: removeCategory } = useStockCategories();
  const { snapshot } = usePortfolio();
  const { institutions } = useFinancialInstitutions();
  const [search, setSearch] = useState('');
  const [dematFilter, setDematFilter] = useState<string[]>([]);
  const [transferFilter, setTransferFilter] = useState<string[]>([]);
  const [holdingSearch, setHoldingSearch] = useState('');
  const [holdingBrokerFilter, setHoldingBrokerFilter] = useState<string[]>([]);
  const [holdingExchangeFilter, setHoldingExchangeFilter] = useState<string[]>([]);
  const [holdingCategoryFilter, setHoldingCategoryFilter] = useState<string[]>([]);
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [addHoldingExchange, setAddHoldingExchange] = useState<string>(SymbolExchange.NSE);
  const [addHoldingSymbol, setAddHoldingSymbol] = useState<string | undefined>(undefined);
  const [addHoldingSymbolName, setAddHoldingSymbolName] = useState('');
  const [addHoldingBrokerId, setAddHoldingBrokerId] = useState<string | undefined>(undefined);
  const [addHoldingCategoryIds, setAddHoldingCategoryIds] = useState<string[]>([]);
  const [addHoldingCategorySelectOpen, setAddHoldingCategorySelectOpen] = useState(false);
  const [addHoldingBrokerSelectOpen, setAddHoldingBrokerSelectOpen] = useState(false);
  const [addBrokerModalOpen, setAddBrokerModalOpen] = useState(false);
  const [holdingSpecialEdit, setHoldingSpecialEdit] = useState(false);
  const [symbolOptions, setSymbolOptions] = useState<SymbolMasterSearchResult[]>([]);
  const [symbolSearchLoading, setSymbolSearchLoading] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');
  const symbolSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolSelectRef = useRef<any>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string[]>([]);
  const brokersPagination = useTablePagination({ resetDeps: [search, dematFilter, transferFilter] });
  const brokersSort = useTableSort();
  const holdingsPagination = useTablePagination({ resetDeps: [holdingSearch, holdingBrokerFilter, holdingExchangeFilter, holdingCategoryFilter] });
  const holdingsSort = useTableSort();
  const categoriesPagination = useTablePagination({ resetDeps: [categorySearch, categoryTypeFilter] });
  const categoriesSort = useTableSort();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryType, setCategoryType] = useState<string | undefined>(undefined);
  const { setBusyIndicator } = useBusyIndicator();
  const [nseSymbolStats, setNseSymbolStats] = useState<SymbolMasterStats>({ count: 0, lastUpdatedAt: null });
  const [bseSymbolStats, setBseSymbolStats] = useState<SymbolMasterStats>({ count: 0, lastUpdatedAt: null });
  const [refreshingSymbols, setRefreshingSymbols] = useState(false);

  const loadSymbolStats = useCallback(async () => {
    try {
      const [nse, bse] = await Promise.all([
        getSymbolMasterStats(SymbolExchange.NSE),
        getSymbolMasterStats(SymbolExchange.BSE),
      ]);
      setNseSymbolStats(nse);
      setBseSymbolStats(bse);
    } catch {
      // ignore - stats are informational
    }
  }, []);

  useEffect(() => { void loadSymbolStats(); }, [loadSymbolStats]);

  const handleRefreshSymbols = async () => {
    setRefreshingSymbols(true);
    setBusyIndicator(true);
    try {
      const stats = await refreshNseSymbolMaster();
      setNseSymbolStats(stats);
      toast.success(t('stocks.holdings.refreshSymbolsSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('stocks.holdings.refreshSymbolsError'));
    } finally {
      setBusyIndicator(false);
      setRefreshingSymbols(false);
    }
  };

  const resetAddHolding = () => {
    setEditingHoldingId(null);
    setAddHoldingExchange(SymbolExchange.NSE);
    setAddHoldingSymbol(undefined);
    setAddHoldingSymbolName('');
    setAddHoldingBrokerId(undefined);
    setAddHoldingCategoryIds([]);
    setSymbolOptions([]);
    setSymbolSearchQuery('');
    setSymbolSearchLoading(false);
    if (symbolSearchTimer.current) clearTimeout(symbolSearchTimer.current);
  };

  const openAddHolding = () => {
    resetAddHolding();
    setAddHoldingOpen(true);
  };

  const openEditHolding = (row: any) => {
    const h = holdings.find((x) => x.id === row.id);
    if (!h) return;
    setEditingHoldingId(h.id);
    setAddHoldingExchange(h.exchange);
    setAddHoldingSymbol(h.symbol);
    setAddHoldingSymbolName(h.name);
    setAddHoldingBrokerId(h.brokerId);
    setAddHoldingCategoryIds(h.categoryIds ?? []);
    setHoldingSpecialEdit(false);
    setSymbolOptions([{ symbol: h.symbol, name: h.name, exchange: h.exchange }]);
    setSymbolSearchQuery('');
    setAddHoldingOpen(true);
  };

  const handleSymbolSearch = (value: string) => {
    setSymbolSearchQuery(value);
    if (symbolSearchTimer.current) clearTimeout(symbolSearchTimer.current);
    const q = value.trim();
    if (q.length < 3) {
      setSymbolOptions([]);
      setSymbolSearchLoading(false);
      return;
    }
    setSymbolSearchLoading(true);
    symbolSearchTimer.current = setTimeout(async () => {
      try {
        const results = await searchSymbolMaster(addHoldingExchange, q, 50);
        setSymbolOptions(results);
      } catch {
        setSymbolOptions([]);
      } finally {
        setSymbolSearchLoading(false);
      }
    }, 250);
  };

  const handleSaveHolding = async () => {
    if (!addHoldingSymbol) {
      toast.error(t('stocks.holdings.validation.symbolRequired'));
      return;
    }
    if (!addHoldingBrokerId) {
      toast.error(t('stocks.holdings.validation.brokerRequired'));
      return;
    }
    const selected = symbolOptions.find((o) => o.symbol === addHoldingSymbol);
    const name = selected?.name ?? addHoldingSymbolName;
    if (!name) {
      toast.error(t('stocks.holdings.validation.symbolRequired'));
      return;
    }
    try {
      const payload = {
        symbol: addHoldingSymbol,
        name,
        exchange: addHoldingExchange as any,
        brokerId: addHoldingBrokerId!,
        categoryIds: addHoldingCategoryIds.length > 0 ? addHoldingCategoryIds : undefined,
      };
      if (editingHoldingId) {
        await updateHolding(editingHoldingId, payload);
        toast.success(t('stocks.holdings.updateSuccess'));
      } else {
        await createHolding(payload);
        toast.success(t('stocks.holdings.addSuccess'));
      }
      setAddHoldingOpen(false);
      resetAddHolding();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('errors.generic'));
    }
  };


  const handleDeleteHolding = (row: any) => {
    modal.confirm({
      title: t('stocks.holdings.deleteTitle'),
      content: t('stocks.holdings.deleteConfirm'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await removeHolding(row.id);
          toast.success(t('common.deleted'));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t('errors.generic'));
        }
      },
    });
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryType(undefined);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: { id: string; name: string; description?: string; type?: string }) => {
    setEditingCategoryId(c.id);
    setCategoryName(c.name);
    setCategoryDescription(c.description ?? '');
    setCategoryType(c.type);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const name = categoryName.trim();
    const description = categoryDescription.trim();
    if (!name) {
      toast.error(t('stocks.categories.validation.nameRequired'));
      return;
    }
    try {
      const payload = { name, description: description || undefined, type: categoryType as any };
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
        toast.success(t('stocks.categories.updateSuccess'));
      } else {
        await createCategory(payload);
        toast.success(t('stocks.categories.addSuccess'));
      }
      setCategoryModalOpen(false);
      setEditingCategoryId(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryType(undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('errors.generic'));
    }
  };

  const handleDeleteCategory = (c: { id: string; name: string }) => {
    modal.confirm({
      title: t('stocks.categories.deleteTitle'),
      content: t('stocks.categories.deleteConfirm'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await removeCategory(c.id);
          toast.success(t('common.deleted'));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t('errors.generic'));
        }
      },
    });
  };

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
        sorter: stringSorter<BrokerRow>((r) => r.name),
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
      symbols: { title: t('stocks.brokers.column.symbols'), dataIndex: 'symbols', key: 'symbols', align: 'right', sorter: numberSorter<BrokerRow>((r) => r.symbols), render: (v: number) => <span className="folio-value">{formatNumber(v, 0)}</span> },
      investedValue: { title: t('stocks.brokers.column.investedValue'), dataIndex: 'investedValue', key: 'investedValue', align: 'right', sorter: numberSorter<BrokerRow>((r) => r.investedValue), render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      marketValue: { title: t('stocks.brokers.column.marketValue'), dataIndex: 'marketValue', key: 'marketValue', align: 'right', sorter: numberSorter<BrokerRow>((r) => r.marketValue), render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      unrealizedGainLoss: {
        title: t('stocks.brokers.column.unrealizedGainLoss'),
        dataIndex: 'unrealizedGainLoss',
        key: 'unrealizedGainLoss',
        align: 'right',
        sorter: numberSorter<BrokerRow>((r) => r.unrealizedGainLoss),
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
        render: (_: unknown, row: BrokerRow) => {
          const deleteDisabled = row.symbols > 0;
          const deleteButton = (
            <Button
              type="text"
              size="small"
              danger
              aria-label={t('common.delete')}
              icon={<Trash2 size={14} />}
              disabled={deleteDisabled}
              onClick={() => handleDelete(row)}
            />
          );
          return (
            <div className="flex items-center justify-end gap-1">
              <Button type="text" size="small" aria-label={t('common.edit')} icon={<Pencil size={14} />} onClick={() => navigate(`/stocks/brokers/${row.id}/edit`)} />
              {deleteDisabled ? (
                <Tooltip title={t('stocks.brokers.deleteHasHoldings')}>
                  <span className="inline-flex">{deleteButton}</span>
                </Tooltip>
              ) : deleteButton}
            </div>
          );
        },
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

  const activeBrokersCount = rows.filter((r) => r.symbols > 0).length;
  const inactiveBrokersCount = rows.length - activeBrokersCount;

  const brokersTab = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={16} />}
          label={t('stocks.brokers.stat.total')}
          value={
            <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="folio-amount text-folio-success-accent">{formatNumber(activeBrokersCount, 0)}</span>
              <span className="text-sm font-medium text-folio-ink/55 dark:text-white/50">{t('stocks.brokers.stat.active')}</span>
              <span className="text-folio-ink/25 dark:text-white/20" aria-hidden="true">·</span>
              <span className="folio-amount text-folio-warning-accent">{formatNumber(inactiveBrokersCount, 0)}</span>
              <span className="text-sm font-medium text-folio-ink/55 dark:text-white/50">{t('stocks.brokers.stat.inactive')}</span>
            </span>
          }
        />
      </div>
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
      sortActive={brokersSort.sortActive}
      onClearSort={brokersSort.clearSort}
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
          columns={brokersSort.applySort(columns as any) as any}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={brokersPagination}
          onChange={brokersSort.onChange as any}
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
    </div>
  );

  const HOLDINGS_TABLE_ID = 'stocks-holdings';
  const CATEGORIES_TABLE_ID = 'stocks-categories';

  const holdingRows = useMemo(() => {
    return holdings.map((h) => {
      const broker = h.brokerId ? brokers.find((b) => b.id === h.brokerId) : undefined;
      const brokerName = broker ? (broker.nickname?.trim() || broker.name) : '';
      const brokerFullName = broker?.name ?? '';
      const brokerNickname = broker?.nickname?.trim() ?? '';
      const categoryNames = (h.categoryIds ?? [])
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      return {
        key: h.id,
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        exchange: h.exchange,
        brokerId: h.brokerId,
        brokerName,
        brokerFullName,
        brokerNickname,
        categoryIds: h.categoryIds ?? [],
        categoryNames,
        activeUnits: 0,
        avgInvestment: 0,
        marketValue: 0,
        unrealizedGainLoss: 0,
      };
    });
  }, [holdings, brokers, categories]);

  const filteredHoldingRows = useMemo(() => {
    let base = holdingRows;
    if (holdingBrokerFilter.length > 0) base = base.filter((r) => r.brokerId && holdingBrokerFilter.includes(r.brokerId));
    if (holdingExchangeFilter.length > 0) base = base.filter((r) => holdingExchangeFilter.includes(r.exchange));
    if (holdingCategoryFilter.length > 0) base = base.filter((r) => (r.categoryIds ?? []).some((id: string) => holdingCategoryFilter.includes(id)));
    const q = holdingSearch.trim();
    if (!q) return base;
    return base
      .map((r) => ({ row: r, score: Math.max(matchScore(q, r.symbol), matchScore(q, r.name), matchScore(q, `${r.exchange}:${r.symbol}`), matchScore(q, r.brokerName ?? ''), ...((r.categoryNames ?? []) as string[]).map((n: string) => matchScore(q, n))) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.row);
  }, [holdingRows, holdingSearch, holdingBrokerFilter, holdingExchangeFilter, holdingCategoryFilter]);

  const holdingColumnDefs = useMemo<TableLayoutColumnDef[]>(() => [
    { key: 'symbol', label: t('stocks.holdings.column.symbol'), required: true },
    { key: 'activeUnits', label: t('stocks.holdings.column.activeUnits') },
    { key: 'avgInvestment', label: t('stocks.holdings.column.avgInvestment') },
    { key: 'marketValue', label: t('stocks.holdings.column.marketValue') },
    { key: 'unrealizedGainLoss', label: t('stocks.holdings.column.unrealizedGainLoss') },
    { key: 'categories', label: t('stocks.holdings.column.categories'), defaultVisible: false },
    { key: 'actions', label: t('common.actions'), locked: true },
  ], [t]);

  const { visibleKeys: holdingVisibleKeys, orderedKeys: holdingOrderedKeys } = useTableLayout(HOLDINGS_TABLE_ID, holdingColumnDefs);

  const holdingColumns = useMemo<ColumnsType<any>>(() => {
    const all: Record<string, ColumnsType<any>[number]> = {
      symbol: {
        title: t('stocks.holdings.column.symbol'),
        dataIndex: 'symbol',
        key: 'symbol',
        sorter: stringSorter<any>((r) => r.symbol),
        render: (_: string, row: any) => {
          const meta = SYMBOL_EXCHANGE_META[row.exchange as SymbolExchange];
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium font-mono truncate">{row.symbol}</span>
                {meta ? <Tag className="!m-0 font-mono" color={meta.tagColor}>{meta.label}</Tag> : null}
              </div>
              <div className="truncate text-[0.6875rem] text-folio-ink/50 dark:text-white/45">{row.name}</div>
              {row.brokerName ? <div className="truncate text-[0.6875rem] text-folio-ink/40 dark:text-white/35">{row.brokerName}</div> : null}
            </div>
          );
        },
      },
      categories: {
        title: t('stocks.holdings.column.categories'),
        dataIndex: 'categoryNames',
        key: 'categories',
        width: 180,
        sorter: stringSorter<any>((r) => (r.categoryNames ?? []).join(', ')),
        render: (_: unknown, row: any) => {
          const names = (row.categoryNames ?? []) as string[];
          if (names.length === 0) return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
          return (
            <div className="flex flex-col items-start gap-1">
              {names.map((name: string) => (
                <Tag key={name} className="!m-0 max-w-full truncate">{name}</Tag>
              ))}
            </div>
          );
        },
      },
      activeUnits: { title: t('stocks.holdings.column.activeUnits'), dataIndex: 'activeUnits', key: 'activeUnits', align: 'right', sorter: numberSorter<any>((r) => r.activeUnits), render: (v: number) => <span className="folio-value">{formatNumber(v, 0)}</span> },
      avgInvestment: { title: t('stocks.holdings.column.avgInvestment'), dataIndex: 'avgInvestment', key: 'avgInvestment', align: 'right', sorter: numberSorter<any>((r) => r.avgInvestment), render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      marketValue: { title: t('stocks.holdings.column.marketValue'), dataIndex: 'marketValue', key: 'marketValue', align: 'right', sorter: numberSorter<any>((r) => r.marketValue), render: (v: number) => <span className="folio-value">{formatINR(v)}</span> },
      unrealizedGainLoss: {
        title: t('stocks.holdings.column.unrealizedGainLoss'),
        dataIndex: 'unrealizedGainLoss',
        key: 'unrealizedGainLoss',
        align: 'right',
        sorter: numberSorter<any>((r) => r.unrealizedGainLoss),
        render: (v: number) => (
          <span className={`folio-value ${v >= 0 ? 'text-folio-success-accent' : 'text-folio-error-accent'}`}>
            {formatINR(v)}
          </span>
        ),
      },
      actions: {
        title: <TableLayoutControl tableId={HOLDINGS_TABLE_ID} columns={holdingColumnDefs} />,
        key: 'actions',
        align: 'right',
        width: 110,
        render: (_: unknown, row: any) => (
          <div className="flex items-center justify-end gap-1">
            <Button type="text" size="small" aria-label={t('common.edit')} icon={<Pencil size={14} />} onClick={() => openEditHolding(row)} />
            <Button type="text" size="small" danger aria-label={t('common.delete')} icon={<Trash2 size={14} />} onClick={() => handleDeleteHolding(row)} />
          </div>
        ),
      },
    };
    return holdingOrderedKeys.filter((k) => holdingVisibleKeys.has(k)).map((k) => all[k]).filter(Boolean) as ColumnsType<any>;
  }, [holdingOrderedKeys, holdingVisibleKeys, holdingColumnDefs, t]);

  const lastSymbolUpdate = [nseSymbolStats.lastUpdatedAt, bseSymbolStats.lastUpdatedAt].filter(Boolean).sort().at(-1) ?? null;

  const holdingsTab = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Database size={16} />}
          label={t('stocks.holdings.listedSymbols')}
          value={
            <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`folio-amount ${SYMBOL_EXCHANGE_META[SymbolExchange.NSE].colorClass ?? ''}`}>{formatNumber(nseSymbolStats.count, 0)}</span>
              <span className={`text-sm font-medium ${SYMBOL_EXCHANGE_META[SymbolExchange.NSE].colorClass ?? ''}`}>NSE</span>
              <span className="text-folio-ink/25 dark:text-white/20" aria-hidden="true">·</span>
              <span className={`folio-amount ${SYMBOL_EXCHANGE_META[SymbolExchange.BSE].colorClass ?? ''}`}>{formatNumber(bseSymbolStats.count, 0)}</span>
              <span className={`text-sm font-medium ${SYMBOL_EXCHANGE_META[SymbolExchange.BSE].colorClass ?? ''}`}>BSE</span>
            </span>
          }
          hint={(
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {t('stocks.holdings.lastUpdatedOn')} {lastSymbolUpdate ? formatDateTime(lastSymbolUpdate) : t('common.never')}
              </span>
              <Button
                type="link"
                size="small"
                className="!h-auto !p-0 !text-[0.6875rem]"
                icon={<RefreshCw size={12} className={refreshingSymbols ? 'animate-spin' : undefined} />}
                onClick={() => void handleRefreshSymbols()}
                loading={refreshingSymbols}
              >
                {t('stocks.holdings.refresh')}
              </Button>
            </div>
          )}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label={t('stocks.holdings.investedSymbols')}
          value={
            <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`folio-amount ${SYMBOL_EXCHANGE_META[SymbolExchange.NSE].colorClass ?? ''}`}>{formatNumber(new Set(holdings.filter((h) => h.exchange === SymbolExchange.NSE).map((h) => h.symbol.toUpperCase())).size, 0)}</span>
              <span className={`text-sm font-medium ${SYMBOL_EXCHANGE_META[SymbolExchange.NSE].colorClass ?? ''}`}>NSE</span>
              <span className="text-folio-ink/25 dark:text-white/20" aria-hidden="true">·</span>
              <span className={`folio-amount ${SYMBOL_EXCHANGE_META[SymbolExchange.BSE].colorClass ?? ''}`}>{formatNumber(new Set(holdings.filter((h) => h.exchange === SymbolExchange.BSE).map((h) => h.symbol.toUpperCase())).size, 0)}</span>
              <span className={`text-sm font-medium ${SYMBOL_EXCHANGE_META[SymbolExchange.BSE].colorClass ?? ''}`}>BSE</span>
            </span>
          }
        />
        <StatCard
          icon={<Wallet size={16} />}
          label={t('stocks.holdings.investedAmount')}
          value={formatINR(0)}
        />
        <StatCard
          icon={<PieChart size={16} />}
          label={t('stocks.holdings.holdingsPosition')}
          value={(
            <div className="space-y-1.5 text-[0.8125rem]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-folio-ink/60 dark:text-white/55">{t('stocks.holdings.marketValue')}</span>
                <span className="font-mono font-semibold text-folio-ink dark:text-folio-cream">{formatINR(0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-folio-ink/60 dark:text-white/55">{t('stocks.holdings.realizedGainLoss')}</span>
                <span className="font-mono font-semibold text-folio-ink dark:text-folio-cream">{formatINR(0)}</span>
              </div>
            </div>
          )}
        />
      </div>

      <ResponsiveTable
        filters={(
          <>
            <Input
              allowClear
              value={holdingSearch}
              onChange={(e) => setHoldingSearch(e.target.value)}
              placeholder={t('stocks.holdings.searchPlaceholder')}
              prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
              className="w-full min-w-0"
            />
            <FilterMultiSelect
              value={holdingBrokerFilter}
              onChange={(v) => setHoldingBrokerFilter(v)}
              options={[...new Map(holdingRows.filter((r) => r.brokerId && r.brokerFullName).map((r) => [r.brokerId as string, { value: r.brokerId as string, label: r.brokerFullName as string, nickname: r.brokerNickname as string }])).values()].sort((a, b) => a.label.localeCompare(b.label))}
              placeholder={t('stocks.holdings.filter.broker')}
              className="w-full min-w-0"
              filterOption={(input, option) => {
                const label = String(option?.label ?? '');
                const nickname = String((option as any)?.nickname ?? '');
                return Math.max(matchScore(input, label), matchScore(input, nickname)) > 0;
              }}
              optionRender={(option) => {
                const selected = holdingBrokerFilter.includes(option.value as string);
                const nickname = String((option.data as any)?.nickname ?? (option as any)?.nickname ?? '');
                return (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={selected} tabIndex={-1} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{String(option.label ?? option.value)}</span>
                      {nickname ? <span className="block truncate text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{nickname}</span> : null}
                    </span>
                  </span>
                );
              }}
            />
            <FilterMultiSelect
              value={holdingExchangeFilter}
              onChange={(v) => setHoldingExchangeFilter(v)}
              options={SYMBOL_EXCHANGE_OPTIONS.filter((o) => holdingRows.some((r) => r.exchange === o.value)).map((o) => ({ value: o.value, label: o.label }))}
              placeholder={t('stocks.holdings.filter.exchange')}
              className="w-full min-w-0"
            />
            <FilterMultiSelect
              showSearch
              value={holdingCategoryFilter}
              onChange={(v) => setHoldingCategoryFilter(v)}
              options={categories.filter((c) => holdingRows.some((r) => (r.categoryIds ?? []).includes(c.id))).map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t('stocks.holdings.filter.category')}
              className="w-full min-w-0"
              filterOption={(input, option) => matchScore(input, String(option?.label ?? '')) > 0}
            />
          </>
        )}
        hasFilters={holdingSearch.trim().length > 0 || holdingBrokerFilter.length > 0 || holdingExchangeFilter.length > 0 || holdingCategoryFilter.length > 0}
        onClearFilters={() => { setHoldingSearch(''); setHoldingBrokerFilter([]); setHoldingExchangeFilter([]); setHoldingCategoryFilter([]); }}
        sortActive={holdingsSort.sortActive}
        onClearSort={holdingsSort.clearSort}
        title={t('stocks.tab.holdings')}
        count={filteredHoldingRows.length}
        actions={(
          <Button type="primary" icon={<Plus size={14} />} onClick={openAddHolding}>
            {t('common.add')}
          </Button>
        )}
      >
        {holdingRows.length === 0 && !holdingsLoading ? (
          <EmptyState icon={Briefcase} title={t('asset.stocks.emptyTitle')} description={t('asset.stocks.description')} />
        ) : (
          <Table
            columns={holdingsSort.applySort(holdingColumns as any) as any}
            dataSource={filteredHoldingRows}
            loading={holdingsLoading}
            pagination={holdingsPagination}
            onChange={holdingsSort.onChange as any}
            size="middle"
            rowKey="key"
            scroll={{ x: 'max-content' }}
          />
        )}
      </ResponsiveTable>

      <Modal
        open={addHoldingOpen}
        title={editingHoldingId ? t('stocks.holdings.editTitle') : t('stocks.holdings.addTitle')}
        onCancel={() => { setAddHoldingOpen(false); resetAddHolding(); }}
        destroyOnClose
        footer={(
          <div className="flex items-center justify-between gap-2">
            <div>
              {editingHoldingId && !holdingSpecialEdit ? (
                <Button
                  danger
                  icon={<ShieldAlert size={15} />}
                  onClick={() => {
                    modal.confirm({
                      title: t('stocks.holdings.specialEdit.confirmTitle'),
                      content: t('stocks.holdings.specialEdit.confirmBody'),
                      okText: t('stocks.holdings.specialEdit.ok'),
                      cancelText: t('common.cancel'),
                      onOk: () => setHoldingSpecialEdit(true),
                    });
                  }}
                >
                  {t('stocks.holdings.specialEdit')}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => { setAddHoldingOpen(false); resetAddHolding(); }}>{t('common.cancel')}</Button>
              <Button type="primary" disabled={!addHoldingSymbol || !addHoldingBrokerId} onClick={() => void handleSaveHolding()}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.holdings.exchange')} <span className="ml-0.5 text-folio-error-accent">*</span></label>
            <Select
              value={addHoldingExchange}
              disabled={!!editingHoldingId && !holdingSpecialEdit}
              onChange={(v) => { setAddHoldingExchange(v); setAddHoldingSymbol(undefined); setAddHoldingSymbolName(''); setSymbolOptions([]); setSymbolSearchQuery(''); }}
              className="w-full"
              options={SYMBOL_EXCHANGE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return {
                  value: opt.value,
                  label: (
                    <span className="inline-flex items-center gap-2">
                      {Icon ? <Icon size={15} className={opt.colorClass} /> : null}
                      <span>{opt.label}</span>
                    </span>
                  ),
                };
              })}
            />
          </div>
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.holdings.symbol')} <span className="ml-0.5 text-folio-error-accent">*</span></label>
            <Select
              ref={symbolSelectRef}
              showSearch
              value={addHoldingSymbol}
              placeholder={t('stocks.holdings.symbolPlaceholder')}
              className="w-full"
              disabled={(!!editingHoldingId && !holdingSpecialEdit) || !addHoldingExchange}
              filterOption={false}
              onSearch={handleSymbolSearch}
              onChange={(v, opt: any) => {
                setAddHoldingSymbol(v);
                setAddHoldingSymbolName(opt?.name ?? '');
                setTimeout(() => symbolSelectRef.current?.blur?.(), 0);
              }}
              loading={symbolSearchLoading}
              notFoundContent={symbolSearchQuery.trim().length < 3 ? <span className="text-xs text-folio-ink/45 dark:text-white/40">{t('stocks.holdings.typeMinChars')}</span> : <span className="text-xs text-folio-ink/45 dark:text-white/40">{t('stocks.holdings.noSymbols')}</span>}
              options={symbolOptions.map((o) => ({
                value: o.symbol,
                label: o.symbol,
                name: o.name,
              }))}
              classNames={{ popup: { root: 'border border-folio-ink/10 dark:border-white/10 rounded-lg shadow-folio' } }}
              optionRender={(opt) => (
                <div className="min-w-0 py-0.5">
                  <div className="truncate font-mono text-[0.8125rem] font-medium text-folio-ink dark:text-folio-cream">{opt.data.value}</div>
                  <div className="truncate text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{(opt.data as any).name}</div>
                </div>
              )}
            />
            {addHoldingSymbol && addHoldingSymbolName ? (
              <p className="mt-1.5 text-[0.6875rem] text-folio-ink/55 dark:text-white/45">{addHoldingSymbolName}</p>
            ) : null}
          </div>
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.holdings.broker')} <span className="ml-0.5 text-folio-error-accent">*</span></label>
            <Select
              allowClear
              open={addHoldingBrokerSelectOpen}
              onOpenChange={setAddHoldingBrokerSelectOpen}
              value={addHoldingBrokerId}
              disabled={!!editingHoldingId && !holdingSpecialEdit}
              placeholder={t('stocks.holdings.brokerPlaceholder')}
              className="w-full"
              onChange={(v) => setAddHoldingBrokerId(v)}
              options={brokers.map((b) => ({ value: b.id, label: b.name, nickname: b.nickname?.trim() || '' }))}
              showSearch
              filterOption={(input, option) => {
                const label = String(option?.label ?? '');
                const nickname = String((option as any)?.nickname ?? '');
                return Math.max(matchScore(input, label), matchScore(input, nickname)) > 0;
              }}
              optionRender={(option) => {
                const nickname = String((option.data as any)?.nickname ?? (option as any)?.nickname ?? '');
                return (
                  <div className="min-w-0 py-0.5">
                    <div className="truncate">{String(option.label ?? option.value)}</div>
                    {nickname ? <div className="truncate text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{nickname}</div> : null}
                  </div>
                );
              }}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <Button
                    type="text"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      setAddHoldingBrokerSelectOpen(false);
                      setAddBrokerModalOpen(true);
                    }}
                    className="w-full justify-start"
                  >
                    {t('stocks.brokers.add')}
                  </Button>
                </>
              )}
            />
          </div>
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.holdings.category')}</label>
            <FilterMultiSelect
              showSearch
              open={addHoldingCategorySelectOpen}
              onOpenChange={setAddHoldingCategorySelectOpen}
              value={addHoldingCategoryIds}
              onChange={(v) => setAddHoldingCategoryIds(v.slice(0, 5))}
              placeholder={t('stocks.holdings.categoryPlaceholder')}
              className="w-full"
              filterOption={(input, option) => {
                const c = categories.find((x) => x.id === option?.value);
                if (!c) return false;
                return Math.max(matchScore(input, c.name), matchScore(input, c.description ?? ''), matchScore(input, c.type ?? '')) > 0;
              }}
              options={(() => {
                const makeOpt = (c: any) => {
                  const selected = addHoldingCategoryIds.includes(c.id);
                  const atLimit = addHoldingCategoryIds.length >= 5 && !selected;
                  return { value: c.id, label: c.name, disabled: atLimit, data: { label: c.name }, searchLabel: c.name };
                };
                const custom = categories.filter((c) => !c.preloaded).sort((a, b) => a.name.localeCompare(b.name)).map(makeOpt);
                const suggested = categories.filter((c) => !!c.preloaded).sort((a, b) => a.name.localeCompare(b.name)).map(makeOpt);
                const groups: any[] = [];
                if (custom.length > 0) groups.push({ label: t('stocks.holdings.categoryGroup.custom'), options: custom });
                if (suggested.length > 0) groups.push({ label: t('stocks.holdings.categoryGroup.suggested'), options: suggested });
                return groups;
              })()}
              optionRender={(option) => {
                const c = categories.find((x) => x.id === option.value);
                const meta = c?.type ? STOCK_CATEGORY_TYPE_META[c.type as StockCategoryType] : undefined;
                const Icon = meta?.icon;
                const selected = addHoldingCategoryIds.includes(option.value as string);
                const atLimit = addHoldingCategoryIds.length >= 5 && !selected;
                return (
                  <span className={`inline-flex w-full items-center gap-2 ${atLimit ? 'opacity-45' : ''}`}>
                    <Checkbox checked={selected} disabled={atLimit} tabIndex={-1} />
                    <span className="min-w-0 flex-1 truncate">{c?.name ?? String(option.value)}</span>
                    {meta ? (
                      <span className={`inline-flex shrink-0 items-center gap-1 text-[0.6875rem] ${meta.colorClass}`}>
                        {Icon ? <Icon size={12} /> : null}
                        <span>{meta.label}</span>
                      </span>
                    ) : null}
                  </span>
                );
              }}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <Button
                    type="text"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      setAddHoldingCategorySelectOpen(false);
                      openAddCategory();
                    }}
                    className="w-full justify-start"
                  >
                    {t('stocks.categories.addTitle')}
                  </Button>
                </>
              )}
            />
            <p className="mt-1.5 text-[0.6875rem] text-folio-warning-accent">{t('stocks.holdings.categoryHint')}</p>
          </div>
        </div>
      </Modal>
    </div>
  );

  const filteredCategories = useMemo(() => {
    let base = categories;
    if (categoryTypeFilter.length > 0) base = base.filter((c) => c.type && categoryTypeFilter.includes(c.type));
    const sortByPreloadedThenName = (a: any, b: any) => {
      const ap = a.preloaded ? 1 : 0;
      const bp = b.preloaded ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return (a.name ?? '').localeCompare(b.name ?? '');
    };
    const q = categorySearch.trim();
    if (!q) return [...base].sort(sortByPreloadedThenName);
    return base
      .map((c) => ({ row: c, score: Math.max(matchScore(q, c.name), matchScore(q, c.description ?? '')) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => (b.score - a.score) || sortByPreloadedThenName(a.row, b.row))
      .map((x) => x.row);
  }, [categories, categorySearch, categoryTypeFilter]);

  const categoryColumnDefs = useMemo<TableLayoutColumnDef[]>(() => [
    { key: 'name', label: t('stocks.categories.column.category'), required: true },
    { key: 'description', label: t('stocks.categories.column.description') },
    { key: 'actions', label: t('common.actions'), locked: true },
  ], [t]);

  const { visibleKeys: categoryVisibleKeys, orderedKeys: categoryOrderedKeys } = useTableLayout(CATEGORIES_TABLE_ID, categoryColumnDefs);

  const categoryColumns = useMemo<ColumnsType<any>>(() => {
    const all: Record<string, ColumnsType<any>[number]> = {
      name: {
        title: t('stocks.categories.column.category'),
        dataIndex: 'name',
        key: 'name',
        width: 260,
        sorter: stringSorter<any>((r) => r.name),
        render: (_: string, row: any) => {
          const meta = row.type ? STOCK_CATEGORY_TYPE_META[row.type as StockCategoryType] : undefined;
          return (
            <div className="min-w-0">
              <div className="font-medium truncate">{row.name}</div>
              {meta ? <div className={`truncate text-[0.6875rem] ${meta.colorClass}`}>{meta.label}</div> : null}
            </div>
          );
        },
      },
      description: {
        title: t('stocks.categories.column.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        sorter: stringSorter<any>((r) => r.description),
        render: (v?: string) => <TruncatedText text={v} maxLength={999} block truncate className="text-folio-ink/70 dark:text-white/65" />,
      },
      actions: {
        title: <TableLayoutControl tableId={CATEGORIES_TABLE_ID} columns={categoryColumnDefs} />,
        key: 'actions',
        align: 'right',
        width: 110,
        render: (_: unknown, row: any) => {
          const isPreloaded = !!row.preloaded;
          const editBtn = <Button type="text" size="small" aria-label={t('common.edit')} icon={<Pencil size={14} />} onClick={(e) => { e.stopPropagation(); openEditCategory(row); }} disabled={isPreloaded} />;
          const deleteBtn = <Button type="text" size="small" danger aria-label={t('common.delete')} icon={<Trash2 size={14} />} onClick={(e) => { e.stopPropagation(); handleDeleteCategory(row); }} disabled={isPreloaded} />;
          return (
            <div className="flex items-center justify-end gap-1">
              {isPreloaded ? <Tooltip title={t('stocks.categories.preloadedTooltip')}><span className="inline-flex">{editBtn}</span></Tooltip> : editBtn}
              {isPreloaded ? <Tooltip title={t('stocks.categories.preloadedTooltip')}><span className="inline-flex">{deleteBtn}</span></Tooltip> : deleteBtn}
            </div>
          );
        },
      },
    };
    return categoryOrderedKeys.filter((k) => categoryVisibleKeys.has(k)).map((k) => all[k]).filter(Boolean) as ColumnsType<any>;
  }, [categoryOrderedKeys, categoryVisibleKeys, categoryColumnDefs, t]);

  const categoriesTab = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Tags size={16} />}
          label={t('stocks.categories.availableCategories')}
          value={(
            <span className={categories.length > 0 ? 'text-folio-success-accent' : undefined}>
              {formatNumber(categories.length, 0)}
            </span>
          )}
        />
      </div>

      <ResponsiveTable
        filters={(
          <>
            <Input
              allowClear
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder={t('stocks.categories.searchPlaceholder')}
              prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
              className="w-full min-w-0"
            />
            <FilterMultiSelect
              value={categoryTypeFilter}
              onChange={(v) => setCategoryTypeFilter(v)}
              options={[
                { value: StockCategoryType.MarketCap, label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.MarketCap] },
                { value: StockCategoryType.Instrument, label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Instrument] },
                { value: StockCategoryType.Style, label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Style] },
                { value: StockCategoryType.Sector, label: STOCK_CATEGORY_TYPE_LABELS[StockCategoryType.Sector] },
              ].filter((o) => categories.some((c) => c.type === o.value))}
              placeholder={t('stocks.categories.type')}
              className="w-full min-w-0"
            />
          </>
        )}
        hasFilters={categorySearch.trim().length > 0 || categoryTypeFilter.length > 0}
        onClearFilters={() => { setCategorySearch(''); setCategoryTypeFilter([]); }}
        sortActive={categoriesSort.sortActive}
        onClearSort={categoriesSort.clearSort}
        title={t('stocks.tab.categories')}
        count={filteredCategories.length}
        actions={(
          <Button type="primary" icon={<Plus size={14} />} onClick={openAddCategory}>
            {t('common.add')}
          </Button>
        )}
      >
        {categories.length === 0 && !categoriesLoading ? (
          <EmptyState icon={Briefcase} title={t('stocks.categories.emptyTitle')} description={t('stocks.categories.emptyDescription')} />
        ) : (
          <Table
            tableLayout="fixed"
            columns={categoriesSort.applySort(categoryColumns as any) as any}
            dataSource={filteredCategories}
            loading={categoriesLoading}
            pagination={categoriesPagination}
            onChange={categoriesSort.onChange as any}
            size="middle"
            rowKey="id"
            onRow={(record: any) => ({
              onClick: () => { if (!record.preloaded) openEditCategory(record); },
              className: record.preloaded ? '' : 'cursor-pointer',
            })}
          />
        )}
      </ResponsiveTable>

    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={t('asset.stocks.label')}
        description={t('asset.stocks.description')}
      />

      {error && <Alert type="error" showIcon title={error} />}
      {holdingsError && <Alert type="error" showIcon title={holdingsError} />}
      {categoriesError && <Alert type="error" showIcon title={categoriesError} />}

      <Tabs
        items={[
          { key: 'holdings', label: <span className="inline-flex items-center gap-2"><Briefcase size={15} />{t('stocks.tab.holdings')}{holdings.length > 0 ? ` (${holdings.length})` : ''}</span>, children: holdingsTab },
          { key: 'brokers', label: <span className="inline-flex items-center gap-2"><Users size={15} />{t('stocks.tab.brokers')}{brokers.length > 0 ? ` (${brokers.length})` : ''}</span>, children: brokersTab },
          { key: 'categories', label: <span className="inline-flex items-center gap-2"><Tags size={15} />{t('stocks.tab.categories')}{categories.length > 0 ? ` (${categories.length})` : ''}</span>, children: categoriesTab },
        ]}
      />
      <StockBrokerFormModal
        open={addBrokerModalOpen}
        onCancel={() => setAddBrokerModalOpen(false)}
        onCreated={(broker) => {
          setAddBrokerModalOpen(false);
          setAddHoldingBrokerId(broker.id);
        }}
      />
      <Modal
        open={categoryModalOpen}
        title={editingCategoryId ? t('stocks.categories.editTitle') : t('stocks.categories.addTitle')}
        onCancel={() => { setCategoryModalOpen(false); setEditingCategoryId(null); }}
        onOk={() => void handleSaveCategory()}
        okText={editingCategoryId ? t('common.save') : t('common.add')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.categories.name')}</label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={t('stocks.categories.namePlaceholder')}
              maxLength={80}
            />
          </div>
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.categories.type')}</label>
            <Select
              allowClear
              value={categoryType}
              onChange={(v) => setCategoryType(v)}
              placeholder={t('stocks.categories.typePlaceholder')}
              className="w-full"
              options={STOCK_CATEGORY_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return {
                  value: opt.value,
                  label: <span className="inline-flex items-center gap-2"><Icon size={15} className={opt.colorClass} /><span>{opt.label}</span></span>,
                };
              })}
            />
          </div>
          <div>
            <label className="folio-label mb-1.5 block">{t('stocks.categories.description')}</label>
            <Input.TextArea
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              placeholder={t('stocks.categories.descriptionPlaceholder')}
              rows={3}
              maxLength={240}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
