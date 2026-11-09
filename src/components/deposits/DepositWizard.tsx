import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Steps } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { DepositFormValues } from './depositFormModel';
import { depositStepFields, type DepositWizardStep } from './depositWizardSteps';
import DepositWizardStepOverview from './DepositWizardStepOverview';
import DepositWizardStepInvestment from './DepositWizardStepInvestment';
import DepositWizardStepMaturity from './DepositWizardStepMaturity';
import DepositWizardStepAdditional from './DepositWizardStepAdditional';

interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  saving?: boolean;
  activeLocked?: boolean;
  terminalLocked?: boolean;
  lienEditable?: boolean;
  isEdit?: boolean;
}

export default function DepositWizard({ onCancel, onSubmit, submitLabel, saving, activeLocked = false, terminalLocked = false, lienEditable = false, isEdit = false }: Props) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const [step, setStep] = useState<DepositWizardStep>(0);
  const [showError, setShowError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const accountType = Form.useWatch('accountType', form);

  const stepItems = useMemo(() => ([
    { title: t('deposit.section.overview') },
    { title: t('deposit.section.depositDetails') },
    { title: t('deposit.section.maturity') },
    { title: t('deposit.section.additional') },
  ]), [t]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    const container = stepRefs.current[step];
    if (!container) return;
    const id = window.requestAnimationFrame(() => {
      const focusable = container.querySelector<HTMLElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"])'
      );
      focusable?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [step]);

  const goNext = async () => {
    setShowError(false);
    try {
      const fields: Array<string | number | (string | number)[]> = [...depositStepFields(step, accountType)];
      if (step === 0) {
        const op = form.getFieldValue('operationType');
        if (op && op !== 'single') {
          const holders = (form.getFieldValue('jointHolders') ?? []) as unknown[];
          for (let i = 0; i < holders.length; i++) {
            fields.push(['jointHolders', i, 'name'], ['jointHolders', i, 'dateOfBirth'], ['jointHolders', i, 'share']);
          }
        }
      }
      await form.validateFields(fields);
      setStep((s) => (Math.min(3, s + 1) as DepositWizardStep));
      scrollTop();
    } catch {
      setShowError(true);
      scrollTop();
    }
  };

  const goBack = () => { setShowError(false); setStep((s) => (Math.max(0, s - 1) as DepositWizardStep)); scrollTop(); };

  const handleFinish = async () => {
    setShowError(false);
    try {
      await form.validateFields();
      onSubmit();
    } catch (err) {
      const errorFields = (err as { errorFields?: Array<{ name: (string | number)[] }> })?.errorFields;
      if (errorFields?.length) {
        setShowError(true);
        const at = form.getFieldValue('accountType');
        const topFields = errorFields.map((e) => e.name?.[0]);
        if (topFields.some((f) => typeof f === 'string' && depositStepFields(0, at).includes(f as keyof DepositFormValues))) setStep(0);
        else if (topFields.some((f) => typeof f === 'string' && depositStepFields(1, at).includes(f as keyof DepositFormValues))) setStep(1);
        else if (topFields.some((f) => typeof f === 'string' && depositStepFields(2, at).includes(f as keyof DepositFormValues))) setStep(2);
        else setStep(3);
        scrollTop();
      }
    }
  };

  return (
    <div>
      <div ref={topRef} />
      <Steps
        current={step}
        items={stepItems}
        size="small"
        className="mb-5"
        onChange={(current) => {
          setShowError(false);
          setStep(current as DepositWizardStep);
          scrollTop();
        }}
      />
      {showError && <Alert type="error" showIcon title={t('deposit.validation.resolveErrors')} className="mb-4" />}
      <div ref={(el) => { stepRefs.current[0] = el; }} style={{ display: step === 0 ? 'block' : 'none' }}><DepositWizardStepOverview activeLocked={activeLocked} terminalLocked={terminalLocked} /></div>
      <div ref={(el) => { stepRefs.current[1] = el; }} style={{ display: step === 1 ? 'block' : 'none' }}><DepositWizardStepInvestment activeLocked={activeLocked} terminalLocked={terminalLocked} lienEditable={lienEditable} isEdit={isEdit} /></div>
      <div ref={(el) => { stepRefs.current[2] = el; }} style={{ display: step === 2 ? 'block' : 'none' }}><DepositWizardStepMaturity activeLocked={activeLocked} terminalLocked={terminalLocked} /></div>
      <div ref={(el) => { stepRefs.current[3] = el; }} style={{ display: step === 3 ? 'block' : 'none' }}><DepositWizardStepAdditional activeLocked={activeLocked} terminalLocked={terminalLocked} /></div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-folio-ink/10 pt-4 dark:border-white/[0.07]">
        <Button onClick={step === 0 ? onCancel : goBack} icon={step === 0 ? undefined : <ArrowLeft size={14} />}>
          {step === 0 ? t('common.cancel') : t('institutions.action.back')}
        </Button>
        {step < 3 ? (
          <Button type="primary" onClick={() => void goNext()}>
            <span className="inline-flex items-center gap-1.5">{t('institutions.action.next')} <ArrowRight size={14} /></span>
          </Button>
        ) : (
          <Button type="primary" loading={saving} onClick={() => void handleFinish()}>
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
