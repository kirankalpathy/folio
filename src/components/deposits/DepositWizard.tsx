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
  allowPreClosure?: boolean;
  isEdit?: boolean;
}

export default function DepositWizard({ onCancel, onSubmit, submitLabel, saving, activeLocked = false, terminalLocked = false, lienEditable = false, allowPreClosure = false, isEdit = false }: Props) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const [step, setStep] = useState<DepositWizardStep>(0);
  const [showError, setShowError] = useState(false);
  const [canSaveAll, setCanSaveAll] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const accountType = Form.useWatch('accountType', form);
  const watchedValues = Form.useWatch([], form);

  const stepItems = useMemo(() => ([
    { title: t('deposit.section.overview') },
    { title: t('deposit.section.depositDetails') },
    { title: t('deposit.section.maturity') },
    { title: t('deposit.section.additional') },
  ]), [t]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

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

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void form
        .validateFields()
        .then(() => { if (!cancelled) setCanSaveAll(true); })
        .catch(() => { if (!cancelled) setCanSaveAll(false); });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isEdit, form, watchedValues, accountType, step]);

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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={topRef} />
      <Steps
        current={step}
        items={stepItems}
        size="small"
        className="mb-5 shrink-0"
        onChange={(current) => {
          setShowError(false);
          setStep(current as DepositWizardStep);
          scrollTop();
        }}
      />
      {showError && <Alert type="error" showIcon title={t('deposit.validation.resolveErrors')} className="mb-4 shrink-0" />}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div ref={(el) => { stepRefs.current[0] = el; }} style={{ display: step === 0 ? 'block' : 'none' }}><DepositWizardStepOverview activeLocked={activeLocked} terminalLocked={terminalLocked} /></div>
        <div ref={(el) => { stepRefs.current[1] = el; }} style={{ display: step === 1 ? 'block' : 'none' }}><DepositWizardStepInvestment activeLocked={activeLocked} terminalLocked={terminalLocked} lienEditable={lienEditable} isEdit={isEdit} /></div>
        <div ref={(el) => { stepRefs.current[2] = el; }} style={{ display: step === 2 ? 'block' : 'none' }}><DepositWizardStepMaturity activeLocked={activeLocked} terminalLocked={terminalLocked} allowPreClosure={allowPreClosure} isEdit={isEdit} /></div>
        <div ref={(el) => { stepRefs.current[3] = el; }} style={{ display: step === 3 ? 'block' : 'none' }}><DepositWizardStepAdditional activeLocked={activeLocked} terminalLocked={terminalLocked} /></div>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-folio-ink/10 bg-folio-paper pt-3 dark:border-white/[0.07] dark:bg-folio-dark-elevated">
        <div className="flex items-center gap-2">
          <Button onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          {step > 0 ? (
            <Button onClick={goBack} icon={<ArrowLeft size={14} />}>
              {t('institutions.action.back')}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isEdit && step < 3 ? (
            <Button onClick={() => void handleFinish()} loading={saving} disabled={!canSaveAll || saving}>
              {submitLabel}
            </Button>
          ) : null}
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
    </div>
  );
}
