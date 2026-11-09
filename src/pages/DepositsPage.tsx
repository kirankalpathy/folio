import { useMemo, useState, type ReactNode } from 'react';
import { Alert, App as AntApp, Button, Checkbox, DatePicker, Input, Segmented, Select, Space, Tag, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/toast/ToastProvider';
import { ChevronLeft, ChevronRight, Equal, EqualNot, Minus, PiggyBank, Plus, Search } from 'lucide-react';
import type { DepositHolding, DepositOperationType, DepositType } from '../types';
import { useDeposits } from '../hooks/useDeposits';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { institutionLabel } from '../services/financialInstitutions';
import { getDepositLifecycleStatus, isClosedDepositStatus, summarizeDeposits, type DepositLifecycleStatus } from '../utils/deposits';
import { getDateFormatId } from '../utils/date';
import { isDateOutsidePickerBounds } from '../config/validationConfig';
import ExportDropdown from '../components/common/ExportDropdown';
import ResponsiveTable from '../components/common/ResponsiveTable';
import { INTEREST_PAYOUT_OPTIONS, OPERATION_TYPE_OPTIONS, toInterestPayoutOption, type InterestPayoutOption } from '../components/deposits/depositFormModel';

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
import { multiselectSuffixIcon } from '../components/common/selectIcons';
import { DEPOSIT_STATUS_SEMANTIC, FOLIO_TAG_CLASS, semanticTagStyle } from '../components/deposits/DepositStatusTag';
import { ACCOUNT_TYPE_FILTER_OPTIONS, accountLabel, accountTypeTagStyle } from '../components/deposits/depositTableHelpers';

export default function DepositsPage() {
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { deposits, isLoading, error, removeDeposit } = useDeposits();
  const { institutions } = useFinancialInstitutions();
  const [depositTab, setDepositTab] = useState<'active' | 'closed'>('active');
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState<string[]>([]);
  const [lifecycleFilter, setLifecycleFilter] = useState<DepositLifecycleStatus[]>([]);
  const [accountTypeFilter, setAccountTypeFilter] = useState<DepositType[]>([]);
  const [interestPayoutFilter, setInterestPayoutFilter] = useState<InterestPayoutOption[]>([]);
  const [maturityDateOp, setMaturityDateOp] = useState<MaturityDateOp>('==');
  const [maturityDateValue, setMaturityDateValue] = useState<Dayjs | null>(null);
  const [operationTypeFilter, setOperationTypeFilter] = useState<DepositOperationType[]>([]);
  const summary = useMemo(() => summarizeDeposits(deposits), [deposits]);
  const resolvedBankName = (d: DepositHolding) => {
    const inst = d.financialInstitutionId ? institutions.find((fi) => fi.id === d.financialInstitutionId) : undefined;
    return inst ? institutionLabel(inst) : d.bankName;
  };
  const tabDeposits = useMemo(
    () => deposits.filter((d) => depositTab === 'closed' ? isClosedDepositStatus(getDepositLifecycleStatus(d)) : !isClosedDepositStatus(getDepositLifecycleStatus(d))),
    [deposits, depositTab],
  );
  const bankOptions = useMemo(
    () =>
      Array.from(new Set(tabDeposits.map((d) => resolvedBankName(d)).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [tabDeposits, institutions],
  );
  const accountTypeOptions = useMemo(() => {
    const present = new Set(tabDeposits.map((d) => d.accountType));
    return ACCOUNT_TYPE_FILTER_OPTIONS.filter((o) => present.has(o.value));
  }, [tabDeposits]);
  const interestPayoutOptions = useMemo(() => {
    const present = new Set(tabDeposits.map((d) => toInterestPayoutOption(d)));
    return INTEREST_PAYOUT_OPTIONS.filter((o) => present.has(o.value));
  }, [tabDeposits]);
  const operationTypeOptions = useMemo(() => {
    const present = new Set(tabDeposits.map((d) => d.operationType ?? 'single'));
    return OPERATION_TYPE_OPTIONS.filter((o) => present.has(o.value));
  }, [tabDeposits]);
  const lifecycleFilterOptions = useMemo(() => {
    const active: Array<{ value: DepositLifecycleStatus; label: string }> = [
      { value: 'planned', label: t('deposit.lifecycle.planned') },
      { value: 'active', label: t('deposit.lifecycle.active') },
      { value: 'in-lien', label: t('deposit.lifecycle.inLien') },
    ];
    const closed: Array<{ value: DepositLifecycleStatus; label: string }> = [
      { value: 'matured', label: t('deposit.lifecycle.matured') },
      { value: 'pre-closed', label: t('deposit.lifecycle.preClosed') },
    ];
    return depositTab === 'closed' ? closed : active;
  }, [depositTab, t]);
  const filteredDeposits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabDeposits.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (bankFilter.length > 0 && !bankFilter.includes(resolvedBankName(d))) return false;
      const status = getDepositLifecycleStatus(d);
      if (lifecycleFilter.length > 0) {
        if (!status || !lifecycleFilter.includes(status)) return false;
      }
      if (accountTypeFilter.length > 0 && !accountTypeFilter.includes(d.accountType)) return false;
      if (interestPayoutFilter.length > 0 && !interestPayoutFilter.includes(toInterestPayoutOption(d))) return false;
      const operationType = d.operationType ?? 'single';
      if (operationTypeFilter.length > 0 && !operationTypeFilter.includes(operationType)) return false;
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
  }, [deposits, institutions, search, bankFilter, lifecycleFilter, accountTypeFilter, interestPayoutFilter, maturityDateOp, maturityDateValue, operationTypeFilter]);

  const hasFilters =
    search.trim().length > 0 ||
    bankFilter.length > 0 ||
    lifecycleFilter.length > 0 ||
    accountTypeFilter.length > 0 ||
    interestPayoutFilter.length > 0 ||
    maturityDateValue != null ||
    operationTypeFilter.length > 0;

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
    if (accountTypeFilter.length > 0) {
      const colorMap: Partial<Record<DepositType, 'info' | 'success' | 'warning' | 'error' | 'neutral'>> = {
        fd: 'success',
        rd: 'info',
        'tax-saving': 'warning',
      };
      appliedFilters.push({
        type: 'tags',
        label: t('deposit.filter.accountType'),
        tags: accountTypeFilter.map((type) => ({
          label: accountLabel(type, t),
          color: colorMap[type] ?? 'neutral',
        })),
      });
    }
    if (interestPayoutFilter.length > 0) {
      const payoutColor: Partial<Record<InterestPayoutOption, 'info' | 'success' | 'warning' | 'error' | 'neutral'>> = {
        cumulative: 'success',
        monthly: 'info',
        quarterly: 'info',
        'semi-annual': 'info',
        annual: 'info',
      };
      appliedFilters.push({
        type: 'tags',
        label: t('deposit.filter.interestPayoutFrequency'),
        tags: interestPayoutFilter.map((value) => ({
          label: t(INTEREST_PAYOUT_OPTIONS.find((o) => o.value === value)?.label ?? 'deposit.payoutMode.cumulative'),
          color: payoutColor[value] ?? 'neutral',
        })),
      });
    }
    if (operationTypeFilter.length > 0) {
      appliedFilters.push({
        type: 'tags',
        label: t('deposit.filter.operationType'),
        tags: operationTypeFilter.map((value) => ({
          label: t(OPERATION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? 'deposit.operationType.single'),
          color: 'neutral',
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
    try {
      const saved = await exportDeposits(filteredDeposits, format, { filters: appliedFilters });
      if (saved) toast.success(t('deposit.export.success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deposit.export.error'));
    } finally {
      // busy indicator handled by ExportDropdown
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
      />

      {error && <Alert type="error" showIcon title={error} />}

      <DepositStats
        summary={summary}
        deposits={deposits}
        onMaturingClick={(days) => {
          setDepositTab('active');
          setLifecycleFilter(['active']);
          setMaturityDateOp('<=');
          setMaturityDateValue(dayjs().add(days, 'day').endOf('day'));
          toast.warning(t('deposit.filters.toast.applied'));
        }}
        onStatusClick={(status) => {
          if (!isClosedDepositStatus(status)) setDepositTab('active');
          setLifecycleFilter([status]);
          toast.warning(t('deposit.filters.toast.applied'));
        }}
        onAccountTypeClick={(type) => {
          setDepositTab('active');
          setAccountTypeFilter([type]);
          toast.warning(t('deposit.filters.toast.applied'));
        }}
      />

      <ResponsiveTable
        beforeFilters={
          <Segmented
            className="folio-view-tabs"
            value={depositTab}
            onChange={(value) => {
              const tab = value as 'active' | 'closed';
              setDepositTab(tab);
              const allowed: DepositLifecycleStatus[] = tab === 'closed' ? ['matured', 'pre-closed'] : ['planned', 'active', 'in-lien'];
              setLifecycleFilter((prev) => prev.filter((s) => allowed.includes(s)));
            }}
            options={[
              { value: 'active', label: t('deposit.tab.active') },
              { value: 'closed', label: t('deposit.tab.closed') },
            ]}
          />
        }
        filters={
          <>
              <Input
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('deposit.search.placeholder')}
                prefix={<Search size={14} className="text-folio-ink/35 dark:text-white/35" />}
                className="w-full min-w-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (<Tooltip title={omitted.map((v) => v.label).join(', ')}><span>+{omitted.length}</span></Tooltip>)}
                value={bankFilter}
                onChange={(value) => setBankFilter(value)}
                placeholder={t('deposit.filter.bank')}
                options={bankOptions}
                suffixIcon={multiselectSuffixIcon}
                popupMatchSelectWidth={false}
                popupClassName="folio-multiselect-dropdown"
                menuItemSelectedIcon={null}
                optionRender={(option) => (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={bankFilter.includes(option.value as string)} tabIndex={-1} />
                    <span className="min-w-0 flex-1">{option.label as ReactNode}</span>
                  </span>
                )}
                className="w-full min-w-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (<Tooltip title={omitted.map((v) => v.label).join(', ')}><span>+{omitted.length}</span></Tooltip>)}
                value={lifecycleFilter}
                onChange={(value) => setLifecycleFilter(value as DepositLifecycleStatus[])}
                placeholder={t('deposit.filter.lifecycle')}
                optionLabelProp="label"
                suffixIcon={multiselectSuffixIcon}
                popupMatchSelectWidth={false}
                popupClassName="folio-multiselect-dropdown"
                menuItemSelectedIcon={null}
                options={lifecycleFilterOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                  children: <Tag bordered={false} style={semanticTagStyle(DEPOSIT_STATUS_SEMANTIC[o.value])} className={FOLIO_TAG_CLASS}>{o.label}</Tag>,
                }))}
                optionRender={(option) => (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={lifecycleFilter.includes(option.value as DepositLifecycleStatus)} tabIndex={-1} />
                    <span>{option.data.children as ReactNode}</span>
                  </span>
                )}
                className="w-full min-w-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (<Tooltip title={omitted.map((v) => v.label).join(', ')}><span>+{omitted.length}</span></Tooltip>)}
                value={accountTypeFilter}
                onChange={(value) => setAccountTypeFilter(value as DepositType[])}
                placeholder={t('deposit.filter.accountType')}
                optionLabelProp="label"
                suffixIcon={multiselectSuffixIcon}
                popupMatchSelectWidth={false}
                popupClassName="folio-multiselect-dropdown"
                menuItemSelectedIcon={null}
                options={accountTypeOptions.map((o) => {
                  const label = accountLabel(o.value, t);
                  return {
                    value: o.value,
                    label,
                    children: (
                      <Tag bordered={false} style={accountTypeTagStyle(o.value)} className={FOLIO_TAG_CLASS}>
                        {label}
                      </Tag>
                    ),
                  };
                })}
                optionRender={(option) => (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={accountTypeFilter.includes(option.value as DepositType)} tabIndex={-1} />
                    <span>{option.data.children as ReactNode}</span>
                  </span>
                )}
                className="w-full min-w-0"
              />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (<Tooltip title={omitted.map((v) => v.label).join(', ')}><span>+{omitted.length}</span></Tooltip>)}
                value={interestPayoutFilter}
                onChange={(value) => setInterestPayoutFilter(value as InterestPayoutOption[])}
                placeholder={t('deposit.filter.interestPayoutFrequency')}
                suffixIcon={multiselectSuffixIcon}
                popupMatchSelectWidth={false}
                popupClassName="folio-multiselect-dropdown"
                menuItemSelectedIcon={null}
                options={interestPayoutOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
                optionRender={(option) => (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={interestPayoutFilter.includes(option.value as InterestPayoutOption)} tabIndex={-1} />
                    <span className="min-w-0 flex-1">{option.label as ReactNode}</span>
                  </span>
                )}
                className="w-full min-w-0"
              />
              <Space.Compact className="w-full min-w-0">
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
                  format={getDateFormatId()}
                  disabledDate={isDateOutsidePickerBounds}
                  style={{ width: 'calc(100% - 44px)' }}
                />
              </Space.Compact>
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (<Tooltip title={omitted.map((v) => v.label).join(', ')}><span>+{omitted.length}</span></Tooltip>)}
                value={operationTypeFilter}
                onChange={(value) => setOperationTypeFilter(value as DepositOperationType[])}
                placeholder={t('deposit.filter.operationType')}
                suffixIcon={multiselectSuffixIcon}
                popupMatchSelectWidth={false}
                popupClassName="folio-multiselect-dropdown"
                menuItemSelectedIcon={null}
                options={operationTypeOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
                optionRender={(option) => (
                  <span className="inline-flex w-full items-center gap-2">
                    <Checkbox checked={operationTypeFilter.includes(option.value as DepositOperationType)} tabIndex={-1} />
                    <span className="min-w-0 flex-1">{option.label as ReactNode}</span>
                  </span>
                )}
                className="w-full min-w-0"
              />
          </>
        }
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch('');
          setBankFilter([]);
          setLifecycleFilter([]);
          setAccountTypeFilter([]);
          setInterestPayoutFilter([]);
          setMaturityDateOp('==');
          setMaturityDateValue(null);
          setOperationTypeFilter([]);
          toast.success(t('deposit.filters.cleared'));
        }}
        title={depositTab === 'closed' ? t('deposit.tab.closed') : t('deposit.tab.active')}
        count={filteredDeposits.length}
        actions={
          <>
            <ExportDropdown
              label={t('deposit.export.button')}
              labels={{
                excel: t('deposit.export.format.excel'),
                csv: t('deposit.export.format.csv'),
                pdf: t('deposit.export.format.pdf'),
              }}
              onExport={(format) => void handleExport(format)}
              hasFilters={hasFilters}
              disabled={isLoading || filteredDeposits.length === 0}
            />
            {depositTab !== 'closed' ? (
              <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                {t('deposit.add')}
              </Button>
            ) : null}
          </>
        }
      >
{!isLoading && deposits.length === 0 ? (
              <EmptyState icon={PiggyBank} title={t('deposit.emptyTitle')} description={t('deposit.emptyBody')}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {t('deposit.addFirst')}
                </Button>
              </EmptyState>
            ) : !isLoading && tabDeposits.length === 0 ? (
              <EmptyState
                icon={PiggyBank}
                title={depositTab === 'closed' ? t('deposit.empty.closed.title') : t('deposit.empty.active.title')}
                description={depositTab === 'closed' ? t('deposit.empty.closed.body') : t('deposit.empty.active.body')}
              />
            ) : !isLoading && filteredDeposits.length === 0 ? (
              <EmptyState icon={Search} title={t('deposit.search.emptyTitle')} description={t('deposit.search.emptyBody')}>
                <Button onClick={() => { setSearch(''); setBankFilter([]); setLifecycleFilter([]); setAccountTypeFilter([]); setInterestPayoutFilter([]); setMaturityDateOp('=='); setMaturityDateValue(null); setOperationTypeFilter([]); }}>{t('common.clear')}</Button>
              </EmptyState>
            ) : (
              <DepositTable deposits={filteredDeposits} loading={isLoading} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
            )}
      </ResponsiveTable>
    </div>
  );
}
