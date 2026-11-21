import { useCallback, useEffect, useState } from 'react';
import { Alert, Form, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { useI18n } from '../i18n';
import { useToast } from '../components/common/toast/ToastProvider';
import { useUnsavedChanges } from '../components/common/UnsavedChangesGuard';
import StockBrokerWizard from '../components/stocks/StockBrokerWizard';
import type { StockBrokerFormValues } from '../components/stocks/StockBrokerWizardStepDetails';
import { createStockBroker, getStockBroker, updateStockBroker } from '../services/stockBrokers';
import { StockBrokerCurrency } from '../types';

export default function StockBrokerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form] = Form.useForm<StockBrokerFormValues>();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const draftKey = isEdit ? `folio:draft:stock-brokers:${id}` : 'folio:draft:stock-brokers:new';
  const clearDraft = useCallback(() => { sessionStorage.removeItem(draftKey); }, [draftKey]);
  const stashDraft = useCallback(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(form.getFieldsValue(true))); } catch { /* ignore */ }
  }, [draftKey, form]);

  useUnsavedChanges(`stock-broker-form:${draftKey}`, { when: !loading && isDirty, onStash: stashDraft });

  useEffect(() => {
    if (!id) {
      let base: StockBrokerFormValues = { name: '', nickname: '', financialInstitutionId: undefined, transferAccountId: undefined, currency: StockBrokerCurrency.INR };
      try { const raw = sessionStorage.getItem(draftKey); if (raw) base = { ...base, ...JSON.parse(raw) }; } catch { /* ignore */ }
      form.setFieldsValue(base);
      setIsDirty(!!sessionStorage.getItem(draftKey));
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    getStockBroker(id)
      .then((record) => {
        if (!active) return;
        if (!record) { setLoadError(t('errors.storage.read')); return; }
        let vals: StockBrokerFormValues = {
          name: record.name,
          nickname: record.nickname ?? '',
          financialInstitutionId: record.financialInstitutionId,
          transferAccountId: record.transferAccountId,
          currency: StockBrokerCurrency.INR,
        };
        try { const raw = sessionStorage.getItem(draftKey); if (raw) vals = { ...vals, ...JSON.parse(raw) }; } catch { /* ignore */ }
        form.setFieldsValue(vals);
        if (sessionStorage.getItem(draftKey)) setIsDirty(true);
      })
      .catch((err) => { if (active) setLoadError(err instanceof Error ? err.message : t('errors.storage.read')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [draftKey, form, id, t]);

  const goBack = () => { clearDraft(); setIsDirty(false); navigate('/stocks'); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue(true);
      const input = {
        name: values.name,
        nickname: values.nickname,
        financialInstitutionId: values.financialInstitutionId,
        transferAccountId: values.transferAccountId,
        currency: StockBrokerCurrency.INR,
      };
      if (isEdit && id) {
        await updateStockBroker(id, input);
        toast.success(t('common.saved'));
      } else {
        await createStockBroker(input);
        toast.success(t('common.saved'));
      }
      clearDraft();
      setIsDirty(false);
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={isEdit ? t('stocks.brokers.editTitle') : t('stocks.brokers.addTitle')} />
        <div className="folio-card grid place-items-center p-10"><Spin /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={isEdit ? t('stocks.brokers.editTitle') : t('stocks.brokers.addTitle')} />
        <Alert type="error" showIcon title={loadError} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <PageHeader
        eyebrow={t('nav.group.portfolio')}
        title={isEdit ? t('stocks.brokers.editTitle') : t('stocks.brokers.addTitle')}
      />
      <section className="folio-card flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: StockBrokerCurrency.INR }}
          onValuesChange={() => setIsDirty(true)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <StockBrokerWizard
            onCancel={goBack}
            onSubmit={() => void handleSubmit()}
            submitLabel={t('common.save')}
            saving={saving}
            isEdit={isEdit}
          />
        </Form>
      </section>
    </div>
  );
}
