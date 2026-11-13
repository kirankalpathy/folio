import { useMemo, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, Empty, Input, Popover, Table, Tag } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { Building2, Pencil, Plus, QrCode, Search, Trash2 } from 'lucide-react';
import TableLayoutControl, { useTableLayout, type TableLayoutColumnDef } from '../components/common/TableLayoutControl';
import ResponsiveTable from '../components/common/ResponsiveTable';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import ExportDropdown from '../components/common/ExportDropdown';
import FilterMultiSelect from '../components/common/FilterMultiSelect';
import TruncatedText from '../components/common/TruncatedText';
import InstitutionStats from '../components/institutions/InstitutionStats';
import { useToast } from '../components/common/toast/ToastProvider';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { useI18n } from '../i18n';
import type { FinancialInstitution, FinancialInstitutionCategory, OperationMode } from '../types';
import { institutionLabel, isFinancialInstitutionLinked } from '../services/financialInstitutions';
import { exportInstitutions, type InstitutionExportFormat } from '../services/institutionExport';
import type { PdfFilter } from '../services/pdfExportUtils';
import { formatINR } from '../utils/finance';

function UpiIdCell({ upiIdRaw }: { upiIdRaw?: string | null }) {
  const { t } = useI18n();
  const upiId = upiIdRaw?.trim();
  if (!upiId) return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  const upiQrValue = `upi://pay?pa=${encodeURIComponent(upiId)}`;
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="font-mono text-[0.6875rem]">{upiId}</span>
      <Popover
        trigger="click"
        placement="bottomLeft"
        overlayInnerStyle={{ padding: 12, maxWidth: 280 }}
        content={
          <div className="space-y-3">
            <Alert
              type="warning"
              showIcon
              className="folio-message-strip folio-message-strip-warning !text-[0.6875rem]"
              title={t('institutions.upi.qrWarning')}
            />
            <div className="flex justify-center rounded-lg bg-white p-2">
              <QRCodeSVG value={upiQrValue} size={160} includeMargin={false} />
            </div>
            <p className="break-all text-center font-mono text-[0.75rem] font-medium text-folio-ink dark:text-folio-dark-text">{upiId}</p>
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
  const [branchFilter, setBranchFilter] = useState<string[]>([]);

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const scrollTableLeft = () => {
    const el = tableWrapRef.current?.querySelector<HTMLElement>('.ant-table-content, .ant-table-body, .ant-table-container');
    if (el) el.scrollLeft = 0;
  };

  const hasFilters = !!search.trim() || categoryFilter.length > 0 || operationModeFilter.length > 0 || branchFilter.length > 0;


  const normalizeBranch = (value?: string | null) => (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const fi of institutions) {
      const b = normalizeBranch(fi.branchName);
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((b) => ({ value: b, label: b }));
  }, [institutions]);

  const fuzzyBranchMatch = (recordBranch: string, selected: string) => {
    if (!recordBranch || !selected) return false;
    if (recordBranch === selected) return true;
    if (recordBranch.includes(selected) || selected.includes(recordBranch)) return true;
    const rTokens = recordBranch.split(' ').filter(Boolean);
    const sTokens = selected.split(' ').filter(Boolean);
    return sTokens.every((st) => rTokens.some((rt) => rt.includes(st) || st.includes(rt)));
  };

  const filteredInstitutions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return institutions.filter((fi) => {
      const mode: OperationMode = fi.operationMode ?? 'online';
      if (categoryFilter.length > 0 && !categoryFilter.includes(fi.category)) return false;
      if (operationModeFilter.length > 0 && !operationModeFilter.includes(mode)) return false;
      if (branchFilter.length > 0) {
        const rb = normalizeBranch(fi.branchName);
        if (!rb || !branchFilter.some((b) => fuzzyBranchMatch(rb, b))) return false;
      }
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
  }, [institutions, search, categoryFilter, operationModeFilter, branchFilter]);

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter([]);
    setOperationModeFilter([]);
    setBranchFilter([]);
  };

  const fiColumnDefs = useMemo<TableLayoutColumnDef[]>(
    () => [
      { key: 'accountNumber', label: t('institutions.table.accountNumber'), defaultVisible: true },
      { key: 'name', label: t('institutions.table.name'), defaultVisible: true, required: true },
      { key: 'nickname', label: t('institutions.table.nickname'), defaultVisible: false },
      { key: 'category', label: t('institutions.table.category'), defaultVisible: true },
      { key: 'operationMode', label: t('institutions.table.operationMode'), defaultVisible: true },
      { key: 'ifscCode', label: t('institutions.table.ifsc'), defaultVisible: false },
      { key: 'cifNumber', label: t('institutions.table.cif'), defaultVisible: false },
      { key: 'branchName', label: t('institutions.table.branch'), defaultVisible: false },
      { key: 'swiftCode', label: t('institutions.table.swift'), defaultVisible: false },
      { key: 'cardNumber', label: t('institutions.table.cardNumber'), defaultVisible: false },
      { key: 'cardNetwork', label: t('institutions.table.cardNetwork'), defaultVisible: false },
      { key: 'creditLimit', label: t('institutions.table.creditLimit'), defaultVisible: false },
      { key: 'billingCycleDay', label: t('institutions.table.billingCycle'), defaultVisible: false },
      { key: 'dematAccountNumber', label: t('institutions.table.demat'), defaultVisible: false },
      { key: 'uniqueClientCode', label: t('institutions.table.ucc'), defaultVisible: false },
      { key: 'dpId', label: t('institutions.table.dpId'), defaultVisible: false },
      { key: 'segments', label: t('institutions.table.segments'), defaultVisible: false },
      { key: 'walletId', label: t('institutions.table.walletId'), defaultVisible: false },
      { key: 'linkedMobile', label: t('institutions.table.linkedMobile'), defaultVisible: false },
      { key: 'upiId', label: t('institutions.table.upiId'), defaultVisible: true },
      { key: 'contactPerson', label: t('institutions.table.contactPerson'), defaultVisible: false },
      { key: 'contactEmail', label: t('institutions.table.contactEmail'), defaultVisible: false },
      { key: 'contactPhone', label: t('institutions.table.contactPhone'), defaultVisible: false },
      { key: 'address', label: t('institutions.table.address'), defaultVisible: false },
      { key: 'actions', label: '', locked: true },
    ],
    [t],
  );
  const { layout: fiLayout } = useTableLayout('financial-institutions', fiColumnDefs);

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
    if (branchFilter.length > 0) {
      filters.push({
        type: 'tags',
        label: t('institutions.filter.branch'),
        tags: branchFilter.map((b) => ({ label: b, color: 'info' as const })),
      });
    }
    return filters;
  };

  const handleExport = async (format: InstitutionExportFormat) => {
    if (filteredInstitutions.length === 0) return;
    try {
      const ok = await exportInstitutions(filteredInstitutions, format, format === 'pdf' ? { filters: buildPdfFilters() } : undefined);
      if (ok) toast.success(t('institutions.export.success'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('institutions.export.error'));
    } finally {
      // busy indicator handled by ExportDropdown
    }
  };

  const dash = <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  const textCell = (v?: string | null, max = 30) => (v?.trim() ? <TruncatedText text={v} maxLength={max} block className="max-w-[220px]" /> : dash);

  const allFiColumns = useMemo<Record<string, NonNullable<React.ComponentProps<typeof Table<FinancialInstitution>>['columns']>[number]>>(
    () => ({
      name: { title: t('institutions.table.name'), dataIndex: 'name', key: 'name', render: (name: string) => <span className="font-medium"><TruncatedText text={name} maxLength={30} block className="max-w-[260px]" /></span> },
      nickname: { title: t('institutions.table.nickname'), key: 'nickname', render: (_, r) => textCell(r.nickname) },
      category: { title: t('institutions.table.category'), dataIndex: 'category', key: 'category', render: (c: FinancialInstitutionCategory) => t(`institutions.category.${c}` as never) },
      operationMode: {
        title: t('institutions.table.operationMode'),
        dataIndex: 'operationMode',
        key: 'operationMode',
        render: (m: OperationMode | undefined) => {
          const mode = m ?? 'online';
          return (
            <Tag className={`folio-tag ${mode === 'online' ? 'border-folio-success-border bg-folio-success-bg text-folio-success-text' : 'border-folio-ink/15 bg-folio-ink/[0.04] text-folio-ink/75 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70'}`}>
              <span className="folio-tag-label">{t(`institutions.operation.${mode}` as never)}</span>
            </Tag>
          );
        },
      },
      accountNumber: { title: t('institutions.table.accountNumber'), key: 'accountNumber', render: (_, r) => textCell(r.accountNumber) },
      ifscCode: { title: t('institutions.table.ifsc'), key: 'ifscCode', render: (_, r) => textCell(r.ifscCode) },
      cifNumber: { title: t('institutions.table.cif'), key: 'cifNumber', render: (_, r) => textCell(r.cifNumber) },
      branchName: { title: t('institutions.table.branch'), key: 'branchName', render: (_, r) => textCell(r.branchName) },
      swiftCode: { title: t('institutions.table.swift'), key: 'swiftCode', render: (_, r) => textCell(r.swiftCode) },
      cardNumber: { title: t('institutions.table.cardNumber'), key: 'cardNumber', render: (_, r) => textCell(r.cardNumber) },
      cardNetwork: { title: t('institutions.table.cardNetwork'), key: 'cardNetwork', render: (_, r) => textCell(r.cardNetwork) },
      creditLimit: { title: t('institutions.table.creditLimit'), key: 'creditLimit', align: 'right', render: (_, r) => r.creditLimit != null ? <span className="font-mono text-xs tabular-nums">{formatINR(r.creditLimit)}</span> : dash },
      billingCycleDay: { title: t('institutions.table.billingCycle'), key: 'billingCycleDay', render: (_, r) => r.billingCycleDay != null ? `${t('institutions.billingCycle.prefix')} ${r.billingCycleDay} ${t('institutions.billingCycle.suffix')}` : dash },
      dematAccountNumber: { title: t('institutions.table.demat'), key: 'dematAccountNumber', render: (_, r) => textCell(r.dematAccountNumber) },
      uniqueClientCode: { title: t('institutions.table.ucc'), key: 'uniqueClientCode', render: (_, r) => textCell(r.uniqueClientCode) },
      dpId: { title: t('institutions.table.dpId'), key: 'dpId', render: (_, r) => textCell(r.dpId) },
      segments: { title: t('institutions.table.segments'), key: 'segments', render: (_, r) => (r.segments?.length ? r.segments.map((s) => t(`institutions.segment.${s}` as never)).join(', ') : dash) },
      walletId: { title: t('institutions.table.walletId'), key: 'walletId', render: (_, r) => textCell(r.walletId) },
      linkedMobile: { title: t('institutions.table.linkedMobile'), key: 'linkedMobile', render: (_, r) => textCell(r.linkedMobile) },
      upiId: { title: t('institutions.table.upiId'), key: 'upiId', render: (_, r) => <UpiIdCell upiIdRaw={r.upiId} /> },
      contactPerson: { title: t('institutions.table.contactPerson'), key: 'contactPerson', render: (_, r) => textCell(r.contactPerson) },
      contactEmail: { title: t('institutions.table.contactEmail'), key: 'contactEmail', render: (_, r) => textCell(r.contactEmail) },
      contactPhone: { title: t('institutions.table.contactPhone'), key: 'contactPhone', render: (_, r) => textCell(r.contactPhone) },
      address: { title: t('institutions.table.address'), key: 'address', render: (_, r) => textCell(r.address, 50) },
      actions: {
        title: <TableLayoutControl tableId="financial-institutions" columns={fiColumnDefs} onReset={scrollTableLeft} />,
        key: 'actions',
        align: 'right',
        width: 110,
        fixed: 'right',
        render: (_, r) => (
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
    }),
    [t, fiColumnDefs, navigate, modal, toast, remove],
  );

  const fiColumns = useMemo(() => {
    const ordered = fiLayout
      .filter((c) => c.visible && allFiColumns[c.key])
      .map((c) => allFiColumns[c.key]!);
    if (!ordered.some((c) => c.key === 'actions') && allFiColumns.actions) ordered.push(allFiColumns.actions);
    const actionsIdx = ordered.findIndex((c) => c.key === 'actions');
    if (actionsIdx >= 0 && actionsIdx !== ordered.length - 1) {
      const [a] = ordered.splice(actionsIdx, 1);
      if (a) ordered.push(a);
    }
    return ordered;
  }, [fiLayout, allFiColumns]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.accounts')}
        title={t('nav.institutions')}
        description={t('institutions.description')}
      />

      <InstitutionStats institutions={institutions} />

      <ResponsiveTable
        filters={
          <>
            <Input
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('institutions.search.placeholder')}
              prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
              className="w-full min-w-0"
            />
            <FilterMultiSelect
              showSearch={{ optionFilterProp: 'label' }}
              value={categoryFilter}
              onChange={(v) => setCategoryFilter((v ?? []) as FinancialInstitutionCategory[])}
              placeholder={t('institutions.filter.category')}
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: t(`institutions.category.${c}` as never) }))}
            />
            <FilterMultiSelect
              value={operationModeFilter}
              onChange={(v) => setOperationModeFilter((v ?? []) as OperationMode[])}
              placeholder={t('institutions.filter.operationMode')}
              options={[
                { value: 'online', label: t('institutions.operation.online') },
                { value: 'offline', label: t('institutions.operation.offline') },
              ]}
            />
            <FilterMultiSelect
              showSearch={{ optionFilterProp: 'label', filterOption: (input, option) => {
                const q = (input ?? '').trim().toUpperCase();
                const label = String(option?.label ?? '').toUpperCase();
                if (!q) return true;
                if (label.includes(q) || q.includes(label)) return true;
                const qTokens = q.split(/\s+/).filter(Boolean);
                const lTokens = label.split(/\s+/).filter(Boolean);
                return qTokens.every((qt) => lTokens.some((lt) => lt.includes(qt) || qt.includes(lt)));
              } }}
              value={branchFilter}
              onChange={(v) => setBranchFilter((v ?? []) as string[])}
              placeholder={t('institutions.filter.branch')}
              options={branchOptions}
            />
          </>
        }
        hasFilters={hasFilters}
        onClearFilters={() => {
          clearAllFilters();
          toast.success(t('institutions.filters.cleared'));
        }}
        title={t('nav.institutions')}
        count={filteredInstitutions.length}
        actions={
          <>
            <ExportDropdown
              label={t('institutions.export.button')}
              labels={{
                excel: t('institutions.export.format.excel'),
                csv: t('institutions.export.format.csv'),
                pdf: t('institutions.export.format.pdf'),
              }}
              onExport={(format) => void handleExport(format)}
              hasFilters={hasFilters}
              disabled={isLoading || filteredInstitutions.length === 0}
            />
            <Button type="primary" icon={<Plus size={15} />} onClick={() => navigate('/institutions/new')}>
              {t('institutions.add')}
            </Button>
          </>
        }
      >
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
          <div ref={tableWrapRef}>
            <Table<FinancialInstitution>
              rowKey="id"
              loading={isLoading}
              dataSource={filteredInstitutions}
              pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: filteredInstitutions.length <= 10 }}
              onRow={(record) => ({ onClick: () => navigate(`/institutions/${record.id}`), style: { cursor: 'pointer' } })}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div className="py-2"><p className="text-sm font-medium">{t('institutions.emptyTitle')}</p><p className="mt-1 text-xs text-folio-ink/45 dark:text-white/40">{t('institutions.emptyBody')}</p></div>} /> }}
              scroll={{ x: 'max-content' }}
              columns={fiColumns}
            />
          </div>
        )}
      </ResponsiveTable>
    </div>
  );
}
