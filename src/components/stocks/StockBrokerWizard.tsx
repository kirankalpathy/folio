import { useMemo, useState } from 'react';
import { Form } from 'antd';
import { useI18n } from '../../i18n';
import Wizard from '../common/Wizard';
import StockBrokerWizardStepDetails, { type StockBrokerFormValues } from './StockBrokerWizardStepDetails';
import StockBrokerWizardStepTransferAccount from './StockBrokerWizardStepTransferAccount';

type StockBrokerWizardStep = 0 | 1;

const STEP_FIELDS: Array<Array<keyof StockBrokerFormValues>> = [
  ['financialInstitutionId', 'name', 'nickname', 'currency'],
  ['transferAccountId'],
];

interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  saving?: boolean;
  isEdit?: boolean;
}

export default function StockBrokerWizard({ onCancel, onSubmit, submitLabel, saving, isEdit = false }: Props) {
  const { t } = useI18n();
  const form = Form.useFormInstance<StockBrokerFormValues>();
  const [step, setStep] = useState<StockBrokerWizardStep>(0);
  const [showError, setShowError] = useState(false);

  const steps = useMemo(() => ([
    { title: t('stocks.brokers.wizard.step.overview') },
    { title: t('stocks.brokers.wizard.step.transferAccount') },
  ]), [t]);

  const validateCurrentStep = async () => {
    await form.validateFields(STEP_FIELDS[step]);
  };

  const handleNext = async () => {
    setShowError(false);
    try {
      await validateCurrentStep();
      setStep((s) => (s < 1 ? ((s + 1) as StockBrokerWizardStep) : s));
    } catch {
      setShowError(true);
    }
  };

  const handleBack = () => {
    setShowError(false);
    setStep((s) => (s > 0 ? ((s - 1) as StockBrokerWizardStep) : s));
  };

  const handleSave = async () => {
    setShowError(false);
    try {
      await form.validateFields();
      onSubmit();
    } catch {
      setShowError(true);
    }
  };

  return (
    <Wizard
      steps={steps}
      currentStep={step}
      onStepChange={(next) => { if (next < step) { setShowError(false); setStep(next as StockBrokerWizardStep); } }}
      onCancel={onCancel}
      onBack={handleBack}
      onNext={handleNext}
      onSave={handleSave}
      onSubmit={handleSave}
      submitLabel={submitLabel}
      saving={saving}
      isEdit={isEdit}
      canSave
      showError={showError}
      errorTitle={t('deposit.validation.resolveErrors')}
      cancelLabel={t('common.cancel')}
      backLabel={t('institutions.action.back')}
      nextLabel={t('institutions.action.next')}
      bodyClassName="min-h-0 flex-1 overflow-y-auto pr-1"
    >
      {step === 0 ? <StockBrokerWizardStepDetails /> : <StockBrokerWizardStepTransferAccount />}
    </Wizard>
  );
}
