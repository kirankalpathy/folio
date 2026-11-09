import { useMemo, useState, type ReactNode } from 'react';
import { Alert, App as AntApp, Button, DatePicker, Dropdown, Input, Select, Space, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/toast/ToastProvider';
import { ChevronLeft, ChevronRight, CopyCheck, Download, Equal, EqualNot, FileSpreadsheet, FileText, Minus, PiggyBank, Plus, Search, Table2 } from 'lucide-react';
import type { DepositHolding } from '../types';
import { useDeposits } from '../hooks/useDeposits';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { institutionLabel } from '../services/financialInstitutions';
import { getDepositLifecycleStatus, summarizeDeposits, type DepositLifecycleStatus } from '../utils/deposits';

type MaturityDateOp = '==' | '<>' | '<' | '>' | '<=' | '>=';

function OpIcon({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex h-4 w-4 items-center justify-center ${className ?? ''}`}>{children}</span>;
}

function LessThanOrEqualIcon() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <ChevronLeft size={12} strokeWidth={2.5} className="-translate-y-[1px]" />
      <Minus size={9} strokeWidth={2.8} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
    </span>
  );
}

function GreaterThanOrEqualIcon() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <ChevronRight size={12} strokeWidth={2.5} className="-translate-y-[1px]" />
      <Minus size={9} strokeWidth={2.8} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
    </span>
  );
}

const MATURITY_DATE_OPS: Array<{ value: MaturityDateOp; label: ReactNode }> = [
  { value: '==', label: <OpIcon className="text-sky-600 dark:text-sky-400"><Equal size={14} strokeWidth={2.2} /></OpIcon> },
  { value: '<>', label: <OpIcon className="text-amber-600 dark:text-amber-400"><EqualNot size={14} strokeWidth={2.2} /></OpIcon> },
  { value: '<', label: <OpIcon className="text-violet-600 dark:text-violet-400"><ChevronLeft size={14} strokeWidth={2.4} /></OpIcon> },
  { value: '>', label: <OpIcon className="text-emerald-600 dark:text-emerald-400"><ChevronRight size={14} strokeWidth={2.4} /></OpIcon> },
  { value: '<=', label: <OpIcon className="text-violet-600 dark:text-violet-400"><LessThanOrEqualIcon /></OpIcon> },
  { value: '>=', label: <OpIcon className="text-emerald-600 dark:text-emerald-400"><GreaterThanOrEqualIcon /></OpIcon> },
];
import { exportDeposits, type DepositExportFormat, type DepositPdfFilter } from '../services/depositExport';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import DepositStats from '../components/deposits/DepositStats';
import DepositTable from '../components/deposits/DepositTable';
import { DEPOSIT_STATUS_SEMANTIC, FOLIO_TAG_CLASS, semanticTagStyle } from '../components/deposits/DepositStatusTag';

export default function DepositsPage() {
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { deposits, isLoading, error, removeDeposit } = useDeposits();
  const { institutions } = useFinancialInstitutions();
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState<string[]>([]);
  const [lifecycleFilter, setLifecycleFilter] = useState<DepositLifecycleStatus[]>([]);
  const [maturityDateOp, setMaturityDateOp] = useState<MaturityDateOp>('==');
  const [maturityDateValue, setMaturityDateValue] = useState<Dayjs | null>(null);
  const [exporting, setExporting] = useState(false);
  const summary = useMemo(() => summarizeDeposits(deposits), [deposits]);
  const resolvedBankName = (d: DepositHolding) => {
    const inst = d.financialInstitutionId ? institutions.find((fi) => fi.id === d.financialInstitutionId) : undefined;
    return inst ? institutionLabel(inst) : d.bankName;
  };
  const bankOptions = useMemo(
    () =>
      Array.from(new Set(deposits.map((d) => resolvedBankName(d)).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [deposits, institutions],
  );
  const filteredDeposits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deposits.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (bankFilter.length > 0 && !bankFilter.includes(resolvedBankName(d))) return false;
      const status = getDepositLifecycleStatus(d);
      if (lifecycleFilter.length > 0) {
        if (!status || !lifecycleFilter.includes(status)) return false;
      }
      if (maturityDateValue) {
        if (!d.maturityDate) return false;
        const md = dayjs(d.maturityDate);
        if (!md.isValid()) return false;
        const same = md.isSame(maturityDateValue, 'day');
        const before = md.isBefore(maturityDateValue, 'day');
        const after = md.isAfter(maturityDateValue, 'day');
        const match =
          maturityDateOp === '==' ? same :
          maturityDateOp === '<>' ? !same :
          maturityDateOp === '<' ? before :
          maturityDateOp === '>' ? after :
          maturityDateOp === '<=' ? (same || before) :
          (same || after);
        if (!match) return false;
      }
      return true;
    });
  }, [deposits, institutions, search, bankFilter, lifecycleFilter, maturityDateOp, maturityDateValue]);

  const hasFilters =
    search.trim().length > 0 ||
    bankFilter.length > 0 ||
    lifecycleFilter.length > 0 ||
    maturityDateValue != null;

  const openCreate = () => navigate('/deposits/new');
  const openView = (deposit: DepositHolding) => navigate(`/deposits/${deposit.id}`);
  const openEdit = (deposit: DepositHolding) => navigate(`/deposits/${deposit.id}/edit`);

  const handleExport = async (format: DepositExportFormat) => {
    if (filteredDeposits.length === 0) return;
    const appliedFilters: DepositPdfFilter[] = [];
    if (search.trim()) {
      appliedFilters.push({ type: 'text', label: t('deposit.search.placeholder'), value: search.trim() });
    }
    if (bankFilter.length > 0) {
      appliedFilters.push({
        type: 'tags',
        label: t('deposit.filter.bank'),
        tags: bankFilter.map((name) => ({ label: name, color: 'neutral' })),
      });
    }
    if (lifecycleFilter.length > 0) {
      appliedFilters.push({
        type: 'tags',
        label: t('deposit.filter.lifecycle'),
        tags: lifecycleFilter.map((s) => ({
          label: t(`deposit.lifecycle.${s === 'in-lien' ? 'inLien' : s === 'pre-closed' ? 'preClosed' : s}`),
          color: DEPOSIT_STATUS_SEMANTIC[s],
        })),
      });
    }
    if (maturityDateValue) {
      appliedFilters.push({
        type: 'date-op',
        label: t('deposit.filter.maturityDate'),
        op: maturityDateOp,
        date: maturityDateValue.format('DD MMM YYYY'),
      });
    }
    setExporting(true);
    try {
      const saved = await exportDeposits(filteredDeposits, format, { filters: appliedFilters });
      if (saved) toast.success(t('deposit.export.success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deposit.export.error'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (deposit: DepositHolding) => {
    modal.confirm({
      title: t('deposit.deleteConfirmTitle'),
      content: t('deposit.deleteConfirmBody', { name: deposit.name }),
      okText: t('common.delete'),
      cancelText: t('common.keep'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeDeposit(deposit.id);
          toast.success(t('deposit.deleted'));
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : t('deposit.deleteError'));
          throw caught;
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={t('asset.deposits.label')}
        description={t('deposit.description')}
        actions={
          <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
            {t('deposit.add')}
          </Button>
        }
      />

      {error && <Alert type="error" showIcon title={error} />}

      <DepositStats
        summary={summary}
        deposits={deposits}
        onMaturingClick={(days) => {
          setLifecycleFilter(['active']);
          setMaturityDateOp('<=');
          setMaturityDateValue(dayjs().add(days, 'day').endOf('day'));
          toast.warning(t('deposit.filters.toast.applied'));
        }}
        onStatusClick={(status) => {
          setLifecycleFilter([status]);
          toast.warning(t('deposit.filters.toast.applied'));
        }}
      />

      <section className="folio-card overflow-hidden">
        <div className="border-b border-folio-ink/10 px-4 py-3.5 dark:border-white/[0.07]">
          <h2 className="text-sm font-semibold">{t('deposit.active')}</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            {hasFilters ? (
              <p className="mb-3 text-[12px] text-folio-ink/55 dark:text-white/50">
                {t('deposit.filters.applied', { count: filteredDeposits.length })}
                <span className="mx-1.5 text-folio-ink/30 dark:text-white/25" aria-hidden="true">•</span>
                <button
                  type="button"
                  className="text-folio-primary underline-offset-2 hover:underline dark:text-folio-accent"
                  onClick={() => {
                    setSearch('');
                    setBankFilter([]);
                    setLifecycleFilter([]);
                    setMaturityDateOp('==');
                    setMaturityDateValue(null);
                    toast.success(t('deposit.filters.cleared'));
                  }}
                >
                  {t('deposit.filters.clearAll')}
                </button>
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <Input
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('deposit.search.placeholder')}
                prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
                className="w-[170px] shrink-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={bankFilter}
                onChange={(value) => setBankFilter(value)}
                placeholder={t('deposit.filter.bank')}
                options={bankOptions}
                suffixIcon={<CopyCheck size={14} className="text-folio-ink/40 dark:text-white/35" />}
                className="w-[150px] shrink-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={lifecycleFilter}
                onChange={(value) => setLifecycleFilter(value as DepositLifecycleStatus[])}
                placeholder={t('deposit.filter.lifecycle')}
                optionLabelProp="label"
                suffixIcon={<CopyCheck size={14} className="text-folio-ink/40 dark:text-white/35" />}
                options={([
                  { value: 'planned', label: t('deposit.lifecycle.planned') },
                  { value: 'active', label: t('deposit.lifecycle.active') },
                  { value: 'in-lien', label: t('deposit.lifecycle.inLien') },
                  { value: 'matured', label: t('deposit.lifecycle.matured') },
                  { value: 'pre-closed', label: t('deposit.lifecycle.preClosed') },
                ] as const).map((o) => ({
                  value: o.value,
                  label: o.label,
                  children: <Tag bordered={false} style={semanticTagStyle(DEPOSIT_STATUS_SEMANTIC[o.value])} className={FOLIO_TAG_CLASS}>{o.label}</Tag>,
                }))}
                optionRender={(option) => option.data.children as ReactNode}
                className="w-[150px] shrink-0"
              />
              <Space.Compact className="w-[184px] shrink-0">
                <Select<MaturityDateOp>
                  value={maturityDateOp}
                  onChange={setMaturityDateOp}
                  options={MATURITY_DATE_OPS}
                  style={{ width: 44 }}
                  popupMatchSelectWidth={56}
                  suffixIcon={null}
                  aria-label={t('deposit.filter.maturityDate')}
                />
                <DatePicker
                  allowClear
                  value={maturityDateValue}
                  onChange={(value) => setMaturityDateValue(value)}
                  placeholder={t('deposit.filter.maturityDate')}
                  format="DD MMM YYYY"
                  style={{ width: 'calc(100% - 44px)' }}
                />
              </Space.Compact>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'xlsx',
                      icon: <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />,
                      label: <span className="text-[12px]">{t('deposit.export.format.excel')}</span>,
                    },
                    {
                      key: 'csv',
                      icon: <Table2 size={14} className="text-sky-600 dark:text-sky-400" />,
                      label: <span className="text-[12px]">{t('deposit.export.format.csv')}</span>,
                    },
                    {
                      key: 'pdf',
                      icon: <FileText size={14} className="text-rose-600 dark:text-rose-400" />,
                      label: <span className="text-[12px]">{t('deposit.export.format.pdf')}</span>,
                    },
                  ],
                  onClick: ({ key }) => void handleExport(key as DepositExportFormat),
                  className: 'min-w-[220px]',
                }}
                disabled={isLoading || filteredDeposits.length === 0}
              >
                <Button icon={<Download size={15} />} loading={exporting} className="sm:ml-auto">
                  {t('deposit.export.button')}
                </Button>
              </Dropdown>
            </div>
          </div>

          <div className="border-t border-folio-ink/10 pt-4 dark:border-white/[0.07]">
            {!isLoading && deposits.length === 0 ? (
              <EmptyState icon={PiggyBank} title={t('deposit.emptyTitle')} description={t('deposit.emptyBody')}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {t('deposit.addFirst')}
                </Button>
              </EmptyState>
            ) : !isLoading && filteredDeposits.length === 0 ? (
              <EmptyState icon={Search} title={t('deposit.search.emptyTitle')} description={t('deposit.search.emptyBody')}>
                <Button onClick={() => { setSearch(''); setBankFilter([]); setLifecycleFilter([]); setMaturityDateOp('=='); setMaturityDateValue(null); }}>{t('common.clear')}</Button>
              </EmptyState>
            ) : (
              <DepositTable deposits={filteredDeposits} loading={isLoading} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
