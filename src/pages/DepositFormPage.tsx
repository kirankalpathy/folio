import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spin } from 'antd';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import type { DepositHolding } from '../types';
import { useI18n } from '../i18n';
import { useToast } from '../components/common/toast/ToastProvider';
import PageHeader from '../components/common/PageHeader';
import DepositWizard from '../components/deposits/DepositWizard';
import DepositDetailsView from '../components/deposits/DepositDetailsView';
import {
  defaultDepositValues,
  toDepositInput,
  toFormValues,
  type DepositFormValues,
} from '../components/deposits/depositFormModel';
import { calculateDepositValues, getDepositLifecycleStatus } from '../utils/deposits';
import { createDeposit, getDeposit, updateDeposit } from '../services/deposits';

export default function DepositFormPage() {
  const { id } = useParams<{ id: string }>();
  const editMatch = useMatch('/deposits/:id/edit');
  const isNew = !id;
  const isEdit = Boolean(editMatch);
  const isView = Boolean(id) && !isEdit;
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form] = Form.useForm<DepositFormValues>();
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<DepositHolding | null>(null);

  useEffect(() => {
    if (!id) {
      setRecord(null);
      form.setFieldsValue(defaultDepositValues());
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
        form.setFieldsValue(toFormValues(loaded));
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

  const goBack = () => navigate('/deposits');

  const handleFinish = async (values: DepositFormValues) => {
    if (isView) return;
    setSaving(true);
    setFormError(false);
    try {
      const computed = calculateDepositValues({
        accountType: values.accountType,
        principal: values.principal,
        recurringAmount: values.recurringAmount,
        interestRate: values.interestRate,
        startDate: values.startDate?.format('YYYY-MM-DD') ?? '',
        maturityDate: values.maturityDate?.format('YYYY-MM-DD') ?? '',
        cumulativeInterest: values.accountType === 'rd' ? true : values.cumulativeInterest,
        compoundingFrequency: values.compoundingFrequency,
      });
      const input = toDepositInput(values, { realizedValue: computed.realizedValue, totalDeposited: computed.totalDeposited });
      if (isEdit && id) {
        await updateDeposit(id, input);
        toast.success(t('deposit.updated'));
      } else if (isNew) {
        await createDeposit(input);
        toast.success(t('deposit.added'));
      }
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

  const lifecycle = record ? getDepositLifecycleStatus(record) : null;
  const isActiveLocked = isEdit && (lifecycle === 'active' || lifecycle === 'in-lien');
  const isTerminalLocked = isEdit && (lifecycle === 'matured' || lifecycle === 'pre-closed');
  const title = isView ? t('deposit.page.viewTitle') : isEdit ? t('deposit.page.editTitle') : t('deposit.page.addTitle');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={title} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('deposit.page.back')}</Button>} />
        <div className="folio-card grid place-items-center p-10"><Spin /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.portfolio')} title={title} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('deposit.page.back')}</Button>} />
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
            <Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('deposit.page.back')}</Button>
            {isView && id ? (
              <Button type="primary" icon={<Pencil size={15} />} onClick={() => navigate(`/deposits/${id}/edit`)}>
                {t('common.edit')}
              </Button>
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
            disabled={isTerminalLocked}
            initialValues={defaultDepositValues()}
            onFinish={handleFinish}
            onFinishFailed={handleFinishFailed}
            onValuesChange={() => formError && setFormError(false)}
            autoComplete="off"
          >
            <DepositWizard
              onCancel={goBack}
              onSubmit={() => form.submit()}
              submitLabel={t(isEdit ? 'common.saveChanges' : 'deposit.add')}
              saving={saving}
              activeLocked={isActiveLocked}
              terminalLocked={isTerminalLocked}
              lienEditable={isEdit && lifecycle === 'in-lien'}
              isEdit={isEdit}
            />
          </Form>
        </section>
      )}
    </div>
  );
}
