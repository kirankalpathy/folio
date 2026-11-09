import { useMemo, useState, type ReactNode } from 'react';
import { Alert, App as AntApp, Button, Empty, Input, Popover, Table, Tag } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { Building2, Pencil, Plus, QrCode, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import ExportDropdown from '../components/common/ExportDropdown';
import FilterMultiSelect from '../components/common/FilterMultiSelect';
import InstitutionStats from '../components/institutions/InstitutionStats';
import { useToast } from '../components/common/toast/ToastProvider';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { useI18n } from '../i18n';
import type { FinancialInstitution, FinancialInstitutionCategory, OperationMode } from '../types';
import { institutionLabel, isFinancialInstitutionLinked } from '../services/financialInstitutions';
import { exportInstitutions, type InstitutionExportFormat } from '../services/institutionExport';
import type { PdfFilter } from '../services/pdfExportUtils';

function UpiIdCell({ upiIdRaw }: { upiIdRaw?: string | null }) {
  const { t } = useI18n();
  const upiId = upiIdRaw?.trim();
  if (!upiId) return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  const upiQrValue = `upi://pay?pa=${encodeURIComponent(upiId)}`;
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="font-mono text-[11px]">{upiId}</span>
      <Popover
        trigger="click"
        placement="bottomLeft"
        overlayInnerStyle={{ padding: 12, maxWidth: 280 }}
        content={
          <div className="space-y-3">
            <Alert
              type="warning"
              showIcon
              className="folio-message-strip folio-message-strip-warning !text-[11px]"
              title={t('institutions.upi.qrWarning')}
            />
            <div className="flex justify-center rounded-lg bg-white p-2">
              <QRCodeSVG value={upiQrValue} size={160} includeMargin={false} />
            </div>
            <p className="break-all text-center font-mono text-[12px] font-medium text-folio-ink dark:text-[#F3F4F6]">{upiId}</p>
          </div>
        }
      >
        <Button
          type="text"
          size="small"
          aria-label={t('institutions.upi.qrAction')}
          icon={<QrCode size={14} className="text-folio-primary dark:text-folio-accent" />}
          className="!inline-flex !h-6 !w-6 !min-w-0 items-center justify-center !p-0"
        />
      </Popover>
    </span>
  );
}

const CATEGORY_OPTIONS: FinancialInstitutionCategory[] = [
  'savings-account',
  'current-account',
  'credit-card-issuer',
  'digital-wallet',
  'investment-brokerage',
];

export default function FinancialInstitutionsPage() {
  const { institutions, isLoading, remove } = useFinancialInstitutions();
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FinancialInstitutionCategory[]>([]);
  const [operationModeFilter, setOperationModeFilter] = useState<OperationMode[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!search.trim() || categoryFilter.length > 0 || operationModeFilter.length > 0;

  const filteredInstitutions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return institutions.filter((fi) => {
      const mode: OperationMode = fi.operationMode ?? 'online';
      if (categoryFilter.length > 0 && !categoryFilter.includes(fi.category)) return false;
      if (operationModeFilter.length > 0 && !operationModeFilter.includes(mode)) return false;
      if (!term) return true;
      const hay = [
        fi.name,
        fi.nickname,
        fi.accountNumber,
        fi.cardNumber,
        fi.dematAccountNumber,
        fi.linkedMobile,
        fi.walletId,
        fi.upiId,
        fi.ifscCode,
        fi.branchName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [institutions, search, categoryFilter, operationModeFilter]);

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter([]);
    setOperationModeFilter([]);
  };

  const buildPdfFilters = (): PdfFilter[] => {
    const filters: PdfFilter[] = [];
    if (search.trim()) filters.push({ type: 'text', label: t('institutions.search.placeholder'), value: search.trim() });
    if (categoryFilter.length > 0) {
      filters.push({
        type: 'tags',
        label: t('institutions.filter.category'),
        tags: categoryFilter.map((c) => ({ label: t(`institutions.category.${c}` as never), color: 'info' as const })),
      });
    }
    if (operationModeFilter.length > 0) {
      filters.push({
        type: 'tags',
        label: t('institutions.filter.operationMode'),
        tags: operationModeFilter.map((m) => ({
          label: t(`institutions.operation.${m}` as never),
          color: m === 'online' ? ('success' as const) : ('neutral' as const),
        })),
      });
    }
    return filters;
  };

  const handleExport = async (format: InstitutionExportFormat) => {
    if (filteredInstitutions.length === 0) return;
    setExporting(true);
    try {
      const ok = await exportInstitutions(filteredInstitutions, format, format === 'pdf' ? { filters: buildPdfFilters() } : undefined);
      if (ok) toast.success(t('institutions.export.success'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('institutions.export.error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.accounts')}
        title={t('nav.institutions')}
        description={t('institutions.description')}
        actions={<Button type="primary" icon={<Plus size={15} />} onClick={() => navigate('/institutions/new')}>{t('institutions.add')}</Button>}
      />

      <InstitutionStats institutions={institutions} />

      <section className="folio-card overflow-hidden">
        <div className="border-b border-folio-ink/10 px-4 py-3.5 dark:border-white/[0.07]">
          <h2 className="text-sm font-semibold">{t('nav.institutions')}</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            {hasFilters ? (
              <p className="mb-3 text-[12px] text-folio-ink/55 dark:text-white/50">
                {t('institutions.filters.applied', { count: filteredInstitutions.length })}
                <span className="mx-1.5 text-folio-ink/30 dark:text-white/25" aria-hidden="true">•</span>
                <button
                  type="button"
                  className="text-folio-primary underline-offset-2 hover:underline dark:text-folio-accent"
                  onClick={() => {
                    clearAllFilters();
                    toast.success(t('institutions.filters.cleared'));
                  }}
                >
                  {t('institutions.filters.clearAll')}
                </button>
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <Input
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('institutions.search.placeholder')}
                prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
                className="w-full min-w-[14rem] sm:max-w-xs"
              />
              <FilterMultiSelect
                showSearch={{ optionFilterProp: 'label' }}
                value={categoryFilter}
                onChange={(v) => setCategoryFilter((v ?? []) as FinancialInstitutionCategory[])}
                placeholder={t('institutions.filter.category')}
                options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: t(`institutions.category.${c}` as never) }))}
                className="sm:w-[16rem]"
              />
              <FilterMultiSelect
                value={operationModeFilter}
                onChange={(v) => setOperationModeFilter((v ?? []) as OperationMode[])}
                placeholder={t('institutions.filter.operationMode')}
                optionLabelProp="label"
                optionRender={(option) => option.data.children as ReactNode}
                options={[
                  {
                    value: 'online',
                    label: t('institutions.operation.online'),
                    children: <Tag bordered={false} className="folio-tag border-folio-success-border bg-folio-success-bg text-folio-success-text"><span className="folio-tag-label">{t('institutions.operation.online')}</span></Tag>,
                  },
                  {
                    value: 'offline',
                    label: t('institutions.operation.offline'),
                    children: <Tag bordered={false} className="folio-tag border-folio-ink/15 bg-folio-ink/[0.04] text-folio-ink/75 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"><span className="folio-tag-label">{t('institutions.operation.offline')}</span></Tag>,
                  },
                ]}
                className="sm:w-[14rem]"
              />
              <ExportDropdown
                label={t('institutions.export.button')}
                labels={{
                  excel: t('institutions.export.format.excel'),
                  csv: t('institutions.export.format.csv'),
                  pdf: t('institutions.export.format.pdf'),
                }}
                onExport={(format) => void handleExport(format)}
                disabled={isLoading || filteredInstitutions.length === 0}
                loading={exporting}
              />
            </div>
          </div>

          <div className="border-t border-folio-ink/10 pt-4 dark:border-white/[0.07]">
            {!isLoading && institutions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="py-2">
                    <p className="text-sm font-medium">{t('institutions.emptyTitle')}</p>
                    <p className="mt-1 text-xs text-folio-ink/45 dark:text-white/40">{t('institutions.emptyBody')}</p>
                    <Button type="primary" size="small" className="mt-3" icon={<Building2 size={14} />} onClick={() => navigate('/institutions/new')}>{t('institutions.add')}</Button>
                  </div>
                }
              />
            ) : !isLoading && filteredInstitutions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="py-1">
                    <p className="text-sm font-medium text-folio-ink/70 dark:text-white/65">{t('institutions.search.emptyTitle')}</p>
                    <p className="mt-1 text-xs text-folio-ink/45 dark:text-white/40">{t('institutions.search.emptyBody')}</p>
                  </div>
                }
              />
            ) : (
              <Table<FinancialInstitution>
                rowKey="id"
                loading={isLoading}
                dataSource={filteredInstitutions}
                pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: filteredInstitutions.length <= 10 }}
                onRow={(record) => ({ onClick: () => navigate(`/institutions/${record.id}`), style: { cursor: 'pointer' } })}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div className="py-2"><p className="text-sm font-medium">{t('institutions.emptyTitle')}</p><p className="mt-1 text-xs text-folio-ink/45 dark:text-white/40">{t('institutions.emptyBody')}</p></div>} /> }}
                columns={[
                  { title: t('institutions.table.name'), dataIndex: 'name', render: (name: string) => <span className="font-medium">{name}</span> },
                  { title: t('institutions.table.category'), dataIndex: 'category', render: (c: FinancialInstitutionCategory) => t(`institutions.category.${c}` as never) },
                  {
                    title: t('institutions.table.operationMode'),
                    dataIndex: 'operationMode',
                    render: (m: OperationMode | undefined) => {
                      const mode = m ?? 'online';
                      return (
                        <Tag className={`folio-tag ${mode === 'online' ? 'border-folio-success-border bg-folio-success-bg text-folio-success-text' : 'border-folio-ink/15 bg-folio-ink/[0.04] text-folio-ink/75 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70'}`}>
                          <span className="folio-tag-label">{t(`institutions.operation.${mode}` as never)}</span>
                        </Tag>
                      );
                    },
                  },
                  { title: t('institutions.table.upiId'), key: 'upiId', render: (_, r) => <UpiIdCell upiIdRaw={r.upiId} /> },
                  {
                    title: '', width: 90, render: (_, r) => (
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => navigate(`/institutions/${r.id}/edit`)} />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={async () => {
                            try {
                              if (await isFinancialInstitutionLinked(r.id)) {
                                modal.info({
                                  title: t('institutions.deleteLinkedTitle'),
                                  content: t('institutions.deleteLinkedError', { name: institutionLabel(r) }),
                                  okText: t('common.ok'),
                                  centered: true,
                                });
                                return;
                              }
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : t('institutions.deleteError'));
                              return;
                            }
                            modal.confirm({
                              title: t('institutions.deleteConfirmTitle'),
                              content: t('institutions.deleteConfirmBody', { name: institutionLabel(r) }),
                              okText: t('common.delete'),
                              okButtonProps: { danger: true },
                              cancelText: t('common.keep'),
                              centered: true,
                              onOk: async () => {
                                try {
                                  await remove(r.id);
                                  toast.success(t('institutions.deleted'));
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : t('institutions.deleteError'));
                                }
                              },
                            });
                          }}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
