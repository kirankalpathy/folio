import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, Form, Spin } from 'antd';
import { FileText, Pencil, ShieldAlert } from 'lucide-react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { useUnsavedChanges } from '../components/common/UnsavedChangesGuard';
import type { DepositHolding } from '../types';
import { useI18n } from '../i18n';
import { useToast } from '../components/common/toast/ToastProvider';
import { useBusyIndicator } from '../components/common/BusyIndicator';
import PageHeader from '../components/common/PageHeader';
import DepositWizard from '../components/deposits/DepositWizard';
import DepositDetailsView from '../components/deposits/DepositDetailsView';
import {
  defaultDepositValues,
  toDepositInput,
  toFormValues,
  type DepositFormValues,
} from '../components/deposits/depositFormModel';
import { calculateDepositValues, DepositLifecycleStatus, getDepositLifecycleStatus } from '../utils/deposits';
import { createDeposit, getDeposit, updateDeposit } from '../services/deposits';
import { exportDepositDetailPdf } from '../services/depositExport';

export default function DepositFormPage() {
  const { id } = useParams<{ id: string }>();
  const editMatch = useMatch('/deposits/:id/edit');
  const isNew = !id;
  const isEdit = Boolean(editMatch);
  const isView = Boolean(id) && !isEdit;
  const navigate = useNavigate();
  const location = useLocation();
  const { modal } = AntApp.useApp();
  const { t } = useI18n();
  const { toast } = useToast();
  const { setBusyIndicator } = useBusyIndicator();
  const isSpecialEditRequested = Boolean((location.state as { specialEdit?: boolean } | null)?.specialEdit);
  const [form] = Form.useForm<DepositFormValues>();
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<DepositHolding | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const draftKey = useMemo(() => (isNew ? 'folio:draft:deposits:new' : id ? `folio:draft:deposits:${id}` : null), [isNew, id]);
  const clearDraft = useCallback(() => { if (draftKey) sessionStorage.removeItem(draftKey); }, [draftKey]);
  const stashDraft = useCallback(() => {
    if (!draftKey) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify(form.getFieldsValue(true))); } catch { /* ignore */ }
  }, [draftKey, form]);

  useUnsavedChanges(`deposit-form:${draftKey ?? 'none'}`, { when: !isView && !loading && isDirty, onStash: stashDraft });

  useEffect(() => {
    if (!id) {
      setRecord(null);
      let base = defaultDepositValues();
      if (draftKey) {
        try { const raw = sessionStorage.getItem(draftKey); if (raw) base = { ...base, ...JSON.parse(raw) }; } catch { /* ignore */ }
      }
      form.setFieldsValue(base);
      setIsDirty(!!draftKey && !!sessionStorage.getItem(draftKey));
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    getDeposit(id)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) {
          setLoadError(t('errors.deposit.missing'));
          return;
        }
        setRecord(loaded);
        let vals = toFormValues(loaded);
        if (draftKey) {
          try { const raw = sessionStorage.getItem(draftKey); if (raw) vals = { ...vals, ...JSON.parse(raw) }; } catch { /* ignore */ }
        }
        form.setFieldsValue(vals);
        if (draftKey && sessionStorage.getItem(draftKey)) setIsDirty(true);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : t('errors.deposit.missing'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form, id, t]);

  const goBack = () => { clearDraft(); setIsDirty(false); navigate('/deposits'); };

  const handleFinish = async (values: DepositFormValues) => {
    if (isView) return;
    setSaving(true);
    setFormError(false);
    try {
      const cumulativeInterest = values.accountType === 'rd' || values.interestPayoutOption === 'cumulative' || !values.interestPayoutOption;
      const payoutFrequency = values.accountType === 'rd' || !values.interestPayoutOption || values.interestPayoutOption === 'cumulative' ? undefined : values.interestPayoutOption;
      const computed = calculateDepositValues({
        accountType: values.accountType,
        principal: values.principal,
        recurringAmount: values.recurringAmount,
        interestRate: values.interestRate,
        startDate: values.startDate?.format('YYYY-MM-DD') ?? '',
        maturityDate: values.maturityDate?.format('YYYY-MM-DD') ?? '',
        cumulativeInterest,
        compoundingFrequency: values.compoundingFrequency,
        payoutFrequency,
      });
      const input = toDepositInput(values, { realizedValue: computed.realizedValue, totalDeposited: computed.totalDeposited, interestPayoutAmount: computed.interestPayoutAmount });
      if (isEdit && id) {
        await updateDeposit(id, input);
        toast.success(t('deposit.updated'));
      } else if (isNew) {
        await createDeposit(input);
        toast.success(t('deposit.added'));
      }
      clearDraft();
      setIsDirty(false);
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deposit.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinishFailed = () => {
    if (isView) return;
    setFormError(true);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExportPdf = async () => {
    if (!record) return;
    setExporting(true);
    setBusyIndicator();
    try {
      const saved = await exportDepositDetailPdf(record, {
        title: t('deposit.export.detailTitle'),
      });
      if (saved) toast.success(t('deposit.export.detailSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deposit.export.detailError'));
    } finally {
      setBusyIndicator(false);
      setExporting(false);
    }
  };

  const lifecycle = record ? getDepositLifecycleStatus(record) : null;
  const isSpecialEdit = isEdit && isSpecialEditRequested && Boolean(lifecycle && lifecycle !== DepositLifecycleStatus.Planned);
  const isActiveLocked = isEdit && !isSpecialEdit && (lifecycle === DepositLifecycleStatus.Active || lifecycle === DepositLifecycleStatus.InLien);
  const isTerminalLocked = isEdit && !isSpecialEdit && (lifecycle === DepositLifecycleStatus.Matured || lifecycle === DepositLifecycleStatus.PreClosed);
  const title = isView ? t('deposit.page.viewTitle') : isEdit ? t('deposit.page.editTitle') : t('deposit.page.addTitle');

  const lifecycleLabel = (state: NonNullable<typeof lifecycle>): string => {
    if (state === DepositLifecycleStatus.InLien) return t('deposit.lifecycle.inLien');
    if (state === DepositLifecycleStatus.PreClosed) return t('deposit.lifecycle.preClosed');
    return t((`deposit.lifecycle.${state}`) as 'deposit.lifecycle.active');
  };

  const handleSpecialEdit = () => {
    if (!id || !lifecycle || lifecycle === 'planned') {
      if (id) navigate(`/deposits/${id}/edit`);
      return;
    }
    modal.confirm({
      title: t('deposit.specialEdit.confirmTitle'),
      content: t('deposit.specialEdit.confirmBody', { state: lifecycleLabel(lifecycle) }),
      okText: t('deposit.specialEdit.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: false },
      onOk: () => navigate(`/deposits/${id}/edit`, { state: { specialEdit: true } }),
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={title} />
        <div className="folio-card grid place-items-center p-10"><Spin /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={title} />
        <Alert type="error" showIcon title={loadError} />
      </div>
    );
  }

  return (
    <div className="space-y-5" ref={topRef}>
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={title}
        description={record?.name}
        actions={
          <div className="flex items-center gap-2">

            {isView && id ? (
              <>
                <Button icon={<FileText size={15} />} onClick={() => void handleExportPdf()} loading={exporting}>
                  {t('deposit.export.pdf')}
                </Button>
                <Button
                  type="primary"
                  icon={<Pencil size={15} />}
                  onClick={() => navigate(`/deposits/${id}/edit`)}
                >
                  {t('common.edit')}
                </Button>
                {lifecycle && lifecycle !== 'planned' ? (
                  <Button danger icon={<ShieldAlert size={15} />} onClick={handleSpecialEdit}>
                    {t('deposit.specialEdit')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />
      {formError && !isView && (
        <Alert type="error" showIcon title={t('deposit.validation.resolveErrors')} />
      )}
      {isActiveLocked && (
        <Alert type="info" showIcon title={t('deposit.edit.activeLocked')} />
      )}
      {isTerminalLocked && (
        <Alert type="info" showIcon title={t('deposit.edit.terminalLocked')} />
      )}
      {isView && record ? (
        <DepositDetailsView record={record} />
      ) : (
        <section className="folio-card p-4 sm:p-5">
          <Form<DepositFormValues>
            form={form}
            layout="vertical"
            requiredMark={(labelNode, { required }) => (
              <>
                {labelNode}
                {required ? <span className="ml-0.5 text-red-500">*</span> : null}
              </>
            )}
            initialValues={defaultDepositValues()}
            onFinish={handleFinish}
            onFinishFailed={handleFinishFailed}
            onValuesChange={() => { if (!isView && !loading) setIsDirty(true); if (formError) setFormError(false); }}
            autoComplete="off"
          >
            <DepositWizard
              onCancel={goBack}
              onSubmit={() => form.submit()}
              submitLabel={t(isEdit ? 'common.saveChanges' : 'deposit.add')}
              saving={saving}
              activeLocked={isActiveLocked}
              terminalLocked={isTerminalLocked}
              lienEditable={isEdit && lifecycle === DepositLifecycleStatus.InLien}
              isEdit={isEdit}
            />
          </Form>
        </section>
      )}
    </div>
  );
}
