import { useMemo, useState, type ReactNode } from 'react';
import { Alert, App as AntApp, Button, Dropdown, Input, Select, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/toast/ToastProvider';
import { Copy, Download, FileSpreadsheet, FileText, PiggyBank, Plus, Search, Table2 } from 'lucide-react';
import type { DepositHolding } from '../types';
import { useDeposits } from '../hooks/useDeposits';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { institutionLabel } from '../services/financialInstitutions';
import { getDepositLifecycleStatus, summarizeDeposits, type DepositLifecycleStatus } from '../utils/deposits';
import { exportDeposits, type DepositExportFormat } from '../services/depositExport';
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
      if (lifecycleFilter.length > 0) {
        const status = getDepositLifecycleStatus(d);
        if (!status || !lifecycleFilter.includes(status)) return false;
      }
      return true;
    });
  }, [deposits, institutions, search, bankFilter, lifecycleFilter]);

  const openCreate = () => navigate('/deposits/new');
  const openView = (deposit: DepositHolding) => navigate(`/deposits/${deposit.id}`);
  const openEdit = (deposit: DepositHolding) => navigate(`/deposits/${deposit.id}/edit`);

  const handleExport = async (format: DepositExportFormat) => {
    if (filteredDeposits.length === 0) return;
    setExporting(true);
    try {
      const saved = await exportDeposits(filteredDeposits, format);
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

      <DepositStats summary={summary} deposits={deposits} />

      <section className="folio-card overflow-hidden">
        <div className="border-b border-folio-ink/10 px-4 py-3.5 dark:border-white/[0.07]">
          <h2 className="text-sm font-semibold">{t('deposit.active')}</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('deposit.search.placeholder')}
                prefix={<Search size={15} className="text-folio-ink/35 dark:text-white/35" />}
                className="w-full max-w-sm"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={bankFilter}
                onChange={(value) => setBankFilter(value)}
                placeholder={t('deposit.filter.bank')}
                options={bankOptions}
                suffixIcon={<Copy size={14} className="text-folio-ink/40 dark:text-white/35" />}
                className="min-w-[220px]"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={lifecycleFilter}
                onChange={(value) => setLifecycleFilter(value as DepositLifecycleStatus[])}
                placeholder={t('deposit.filter.lifecycle')}
                optionLabelProp="label"
                suffixIcon={<Copy size={14} className="text-folio-ink/40 dark:text-white/35" />}
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
                className="min-w-[220px]"
              />
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
                <Button onClick={() => { setSearch(''); setBankFilter([]); setLifecycleFilter([]); }}>{t('common.clear')}</Button>
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
