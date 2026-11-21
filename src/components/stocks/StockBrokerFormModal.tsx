import { useState } from 'react';
import { Form, Modal } from 'antd';
import { useI18n } from '../../i18n';
import { useToast } from '../common/toast/ToastProvider';
import StockBrokerWizard from './StockBrokerWizard';
import type { StockBrokerFormValues } from './StockBrokerWizardStepDetails';
import { createStockBroker } from '../../services/stockBrokers';
import { StockBrokerCurrency, type StockBroker } from '../../types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated?: (broker: StockBroker) => void;
}

export default function StockBrokerFormModal({ open, onCancel, onCreated }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form] = Form.useForm<StockBrokerFormValues>();
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue(true);
      const broker = await createStockBroker({
        name: values.name,
        nickname: values.nickname,
        financialInstitutionId: values.financialInstitutionId,
        transferAccountId: values.transferAccountId,
        currency: StockBrokerCurrency.INR,
      });
      toast.success(t('common.saved'));
      form.resetFields();
      onCreated?.(broker);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('stocks.brokers.addTitle')}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
      width={760}
    >
      {open ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: StockBrokerCurrency.INR }}
          className="flex min-h-0 flex-col"
        >
          <StockBrokerWizard
            onCancel={handleCancel}
            onSubmit={() => void handleSubmit()}
            submitLabel={t('common.save')}
            saving={saving}
          />
        </Form>
      ) : null}
    </Modal>
  );
}
