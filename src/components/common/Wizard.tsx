import type { ReactNode } from 'react';
import { Alert, App, Button, Steps } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface WizardStepItem {
  title: ReactNode;
}

interface WizardProps {
  steps: WizardStepItem[];
  currentStep: number;
  onCancel: () => void;
  onBack?: () => void;
  onNext?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  submitLabel: string;
  saving?: boolean;
  isEdit?: boolean;
  canSave?: boolean;
  showError?: boolean;
  errorTitle?: ReactNode;
  onStepChange?: (step: number) => void;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  stepsClassName?: string;
  alertClassName?: string;
  cancelLabel?: ReactNode;
  backLabel?: ReactNode;
  nextLabel?: ReactNode;
  children: ReactNode;
}

export default function Wizard({
  steps,
  currentStep,
  onCancel,
  onBack,
  onNext,
  onSave,
  onSubmit,
  submitLabel,
  saving = false,
  isEdit = false,
  canSave = true,
  showError = false,
  errorTitle,
  onStepChange,
  className,
  bodyClassName,
  footerClassName,
  stepsClassName = 'mb-5 shrink-0',
  alertClassName = 'mb-4 shrink-0',
  cancelLabel = 'Cancel',
  backLabel = 'Back',
  nextLabel = 'Next',
  children,
}: WizardProps) {
  const { t } = useI18n();
  const { modal } = App.useApp();
  const lastStep = steps.length - 1;
  const isLast = currentStep >= lastStep;

  const handleCancel = () => {
    modal.confirm({
      title: t('common.unsavedChanges.title'),
      content: t('common.unsavedChanges.body'),
      okText: t('common.unsavedChanges.proceed'),
      cancelText: t('common.unsavedChanges.stay'),
      onOk: () => onCancel(),
    });
  };

  return (
    <div className={className ?? 'flex h-full min-h-0 flex-1 flex-col'}>
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        className={stepsClassName}
        onChange={onStepChange ? (current) => onStepChange(current) : undefined}
      />
      {showError && errorTitle ? <Alert type="error" showIcon title={errorTitle} className={alertClassName} /> : null}
      <div className={bodyClassName ?? 'min-h-0 flex-1 overflow-y-auto pr-1'}>{children}</div>
      <div className={footerClassName ?? 'mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-folio-ink/10 bg-folio-paper pt-3 dark:border-white/[0.07] dark:bg-folio-dark-elevated'}>
        <div className="flex items-center gap-2">
          <Button onClick={handleCancel}>{cancelLabel}</Button>
          {currentStep > 0 ? (
            <Button onClick={onBack} icon={<ArrowLeft size={14} />}>
              {backLabel}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isEdit && !isLast ? (
            <Button onClick={() => void onSave?.()} loading={saving} disabled={!canSave || saving}>
              {submitLabel}
            </Button>
          ) : null}
          {!isLast ? (
            <Button type="primary" onClick={() => void onNext?.()}>
              <span className="inline-flex items-center gap-1.5">{nextLabel} <ArrowRight size={14} /></span>
            </Button>
          ) : (
            <Button type="primary" loading={saving} disabled={saving} onClick={() => void onSubmit()}>
              {submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
