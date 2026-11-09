import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Form, Input, InputNumber, Segmented, Select, Steps } from 'antd';
import { ArrowLeft, ArrowRight, Building2, CreditCard, Landmark, LineChart, MapPin, Users, Wallet } from 'lucide-react';
import type { CardNetwork, FinancialInstitution, FinancialInstitutionCategory, FinancialInstitutionInput, InvestmentSegment } from '../../types';
import { useI18n } from '../../i18n';
import { UPI_ID_REGEX } from '../../utils/upi';
import {
  defaultInstitutionValues,
  stepFields,
  toInstitutionInput,
  toWizardValues,
  type InstitutionWizardValues,
  type WizardStep,
} from './institutionWizardModel';

interface Props {
  institution?: FinancialInstitution | null;
  onCancel: () => void;
  onSubmit: (values: FinancialInstitutionInput) => Promise<void>;
  submitLabel?: string;
}

function formatCardNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

function NetworkIcon({ network }: { network: CardNetwork }) {
  const styles: Record<CardNetwork, string> = {
    VISA: 'bg-[#1A1F71] text-white',
    MasterCard: 'bg-[#EB001B] text-white',
    RuPay: 'bg-[#0B3C6D] text-white',
    'American Express': 'bg-[#2E77BC] text-white',
  };
  const short: Record<CardNetwork, string> = { VISA: 'VISA', MasterCard: 'MC', RuPay: 'RuPay', 'American Express': 'AMEX' };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${styles[network]}`}>{short[network]}</span>;
}

function NetworkOption({ network, label }: { network: CardNetwork; label: string }) {
  return <span className="inline-flex items-center gap-2"><NetworkIcon network={network} /><span>{label}</span></span>;
}

function CategoryLabel({ category, label }: { category: FinancialInstitutionCategory; label: string }) {
  const icons: Record<FinancialInstitutionCategory, ReactNode> = {
    'savings-account': <Landmark size={15} className="text-emerald-600 dark:text-emerald-400" />,
    'current-account': <Building2 size={15} className="text-sky-600 dark:text-sky-400" />,
    'credit-card-issuer': <CreditCard size={15} className="text-violet-600 dark:text-violet-400" />,
    'digital-wallet': <Wallet size={15} className="text-amber-600 dark:text-amber-400" />,
    'investment-brokerage': <LineChart size={15} className="text-folio-primary dark:text-folio-accent" />,
  };
  return <span className="inline-flex items-center gap-2">{icons[category]}<span>{label}</span></span>;
}

export default function InstitutionWizard({ institution, onCancel, onSubmit, submitLabel }: Props) {
  const { t } = useI18n();
  const [form] = Form.useForm<InstitutionWizardValues>();
  const [step, setStep] = useState<WizardStep>(0);
  const [saving, setSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const category = (Form.useWatch('category', form) ?? 'savings-account') as FinancialInstitutionCategory;

  useEffect(() => {
    form.resetFields();
    setStep(0);
    setShowError(false);
    if (institution) {
      const values = toWizardValues(institution);
      form.setFieldsValue(values);
      setShowContact(Boolean(values.contactPerson || values.contactEmail || values.contactPhone));
      setShowAddress(Boolean(values.address));
    } else {
      form.setFieldsValue(defaultInstitutionValues());
      setShowContact(false);
      setShowAddress(false);
    }
  }, [form, institution]);

  const stepItems = useMemo(() => ([
    { title: t('institutions.step.overview') },
    { title: t('institutions.step.accountDetails') },
    { title: t('institutions.step.additionalDetails') },
  ]), [t]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const goNext = async () => {
    setShowError(false);
    try {
      await form.validateFields(stepFields(step, category));
      setStep((s) => (Math.min(2, s + 1) as WizardStep));
      scrollTop();
    } catch {
      setShowError(true);
      scrollTop();
    }
  };

  const goBack = () => {
    setShowError(false);
    setStep((s) => (Math.max(0, s - 1) as WizardStep));
    scrollTop();
  };

  const handleFinish = async () => {
    setShowError(false);
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);
      setSaving(true);
      await onSubmit(toInstitutionInput(values));
    } catch (err) {
      if ((err as { errorFields?: unknown[] })?.errorFields) {
        setShowError(true);
        // jump to first invalid step
        const fields = (err as { errorFields?: Array<{ name: (string | number)[] }> }).errorFields?.map((e) => e.name?.[0]) ?? [];
        if (fields.some((f) => stepFields(0, category).includes(f as keyof InstitutionWizardValues))) setStep(0);
        else if (fields.some((f) => stepFields(1, category).includes(f as keyof InstitutionWizardValues))) setStep(1);
        else setStep(2);
        scrollTop();
      }
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const submitText = submitLabel ?? (institution ? t('common.saveChanges') : t('institutions.add'));

  return (
    <div>
      <div ref={topRef} />
      <Steps current={step} items={stepItems} size="small" className="mb-5" />
      {showError && <Alert type="error" showIcon title={t('institutions.formErrors')} className="mb-4" />}
      <Form<InstitutionWizardValues> form={form} layout="vertical" requiredMark initialValues={defaultInstitutionValues()} autoComplete="off">
        <div style={{ display: step === 0 ? 'block' : 'none' }}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item label={t('institutions.fields.name')} name="name" rules={[{ required: true, whitespace: true, message: t('institutions.validation.nameRequired') }]}>
              <Input placeholder={t('institutions.placeholder.name')} />
            </Form.Item>
            <Form.Item label={t('institutions.fields.category')} name="category" rules={[{ required: true, message: t('institutions.validation.categoryRequired') }]}>
              <Select
                optionLabelProp="label"
                onChange={(value: FinancialInstitutionCategory) => {
                  if (value !== 'digital-wallet' && !form.getFieldValue('operationMode')) {
                    form.setFieldValue('operationMode', 'online');
                  }
                }}
                options={([
                  'savings-account',
                  'current-account',
                  'credit-card-issuer',
                  'digital-wallet',
                  'investment-brokerage',
                ] as FinancialInstitutionCategory[]).map((c) => ({
                  value: c,
                  label: <CategoryLabel category={c} label={t(`institutions.category.${c}`)} />,
                }))}
              />
            </Form.Item>
            <Form.Item label={t('institutions.fields.nickname')} name="nickname" className="sm:col-span-2">
              <Input placeholder={t('institutions.placeholder.nickname')} />
            </Form.Item>
          </div>
        </div>

        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          {(category === 'savings-account' || category === 'current-account') && (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item label={t('institutions.fields.accountNumber')} name="accountNumber" rules={[{ required: true, whitespace: true, message: t('institutions.validation.accountRequired') }]}>
                <Input placeholder={t('institutions.placeholder.accountNumber')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.ifsc')} name="ifscCode" rules={[{ required: true, whitespace: true, message: t('institutions.validation.ifscRequired') }]}>
                <Input placeholder={t('institutions.placeholder.ifsc')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.cif')} name="cifNumber">
                <Input placeholder={t('institutions.placeholder.cif')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.branch')} name="branchName">
                <Input placeholder={t('institutions.placeholder.branch')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.swift')} name="swiftCode">
                <Input placeholder={t('institutions.placeholder.swift')} />
              </Form.Item>
              <Form.Item
                label={t('institutions.fields.upiId')}
                name="upiId"
                rules={[
                  {
                    validator: async (_, value: string) => {
                      if (!value?.trim()) return;
                      if (UPI_ID_REGEX.test(value.trim())) return;
                      throw new Error(t('institutions.validation.upiIdInvalid'));
                    },
                  },
                ]}
              >
                <Input placeholder={t('institutions.placeholder.upiId')} />
              </Form.Item>
            </div>
          )}

          {category === 'credit-card-issuer' && (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item
                label={t('institutions.fields.cardNumber')}
                name="cardNumber"
                className="sm:col-span-2"
                rules={[{ required: true, whitespace: true, message: t('institutions.validation.cardNumberRequired') }, { validator: async (_, v: string) => { if (!v || v.replace(/\D/g, '').length === 16) return; throw new Error(t('institutions.validation.cardNumberRequired')); } }]}
              >
                <Input
                  inputMode="numeric"
                  maxLength={19}
                  placeholder={t('institutions.placeholder.cardNumber')}
                  prefix={<CreditCard size={15} className="text-folio-ink/35 dark:text-white/35" />}
                  onChange={(e) => form.setFieldValue('cardNumber', formatCardNumberInput(e.target.value))}
                />
              </Form.Item>
              <Form.Item label={t('institutions.fields.cardNetwork')} name="cardNetwork" rules={[{ required: true, message: t('institutions.validation.cardNetworkRequired') }]}>
                <Select
                  placeholder={t('institutions.validation.cardNetworkRequired')}
                  optionLabelProp="label"
                  options={(['VISA', 'MasterCard', 'RuPay', 'American Express'] as CardNetwork[]).map((n) => ({
                    value: n,
                    label: <NetworkOption network={n} label={t(`institutions.network.${n}` as const)} />,
                  }))}
                />
              </Form.Item>
              <Form.Item label={t('institutions.fields.creditLimit')} name="creditLimit">
                <InputNumber className="w-full" min={0} precision={0} prefix="₹" placeholder={t('institutions.placeholder.creditLimit')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.billingCycle')} name="billingCycleDay">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-folio-ink/70 dark:text-white/60">{t('institutions.billingCycle.prefix')}</span>
                  <Select
                    allowClear
                    size="small"
                    className="w-[56px]"
                    placeholder={t('institutions.placeholder.billingCycle')}
                    options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))}
                    listHeight={128}
                    popupMatchSelectWidth={56}
                  />
                  <span className="text-sm text-folio-ink/70 dark:text-white/60">{t('institutions.billingCycle.suffix')}</span>
                </div>
              </Form.Item>
            </div>
          )}

          {category === 'investment-brokerage' && (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item label={t('institutions.fields.demat')} name="dematAccountNumber" className="sm:col-span-2" rules={[{ required: true, whitespace: true, message: t('institutions.validation.dematRequired') }]}>
                <Input placeholder={t('institutions.placeholder.demat')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.ucc')} name="uniqueClientCode" rules={[{ required: true, whitespace: true, message: t('institutions.validation.uccRequired') }]}>
                <Input placeholder={t('institutions.placeholder.ucc')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.dpId')} name="dpId" rules={[{ required: true, whitespace: true, message: t('institutions.validation.dpIdRequired') }]}>
                <Input placeholder={t('institutions.placeholder.dpId')} />
              </Form.Item>
              <Form.Item label={t('institutions.fields.segments')} name="segments" className="sm:col-span-2" rules={[{ required: true, type: 'array', min: 1, message: t('institutions.validation.segmentsRequired') }]}>
                <Select
                  mode="multiple"
                  placeholder={t('institutions.validation.segmentsRequired')}
                  options={(['cash-equity-mf', 'equity-fo', 'commodities', 'debt'] as InvestmentSegment[]).map((s) => ({
                    value: s,
                    label: t(`institutions.segment.${s}` as const),
                  }))}
                />
              </Form.Item>
            </div>
          )}

          {category === 'digital-wallet' && (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item label={t('institutions.fields.linkedMobile')} name="linkedMobile" rules={[{ required: true, whitespace: true, message: t('institutions.validation.linkedMobileRequired') }]}>
                <Input placeholder={t('institutions.placeholder.linkedMobile')} />
              </Form.Item>
              <Form.Item
                label={t('institutions.fields.upiId')}
                name="upiId"
                rules={[
                  {
                    validator: async (_, value: string) => {
                      if (!value?.trim()) return;
                      if (UPI_ID_REGEX.test(value.trim())) return;
                      throw new Error(t('institutions.validation.upiIdInvalid'));
                    },
                  },
                ]}
              >
                <Input placeholder={t('institutions.placeholder.upiId')} />
              </Form.Item>
            </div>
          )}
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              label={t('institutions.fields.operationMode')}
              name="operationMode"
              className="sm:col-span-2"
              rules={category === 'digital-wallet' ? [] : [{ required: true, message: t('institutions.validation.operationModeRequired') }]}
            >
              <Segmented
                block
                options={[
                  { value: 'online', label: t('institutions.operation.online') },
                  { value: 'offline', label: t('institutions.operation.offline') },
                ]}
              />
            </Form.Item>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <Button
                type={showContact ? 'primary' : 'default'}
                ghost={showContact}
                icon={<Users size={14} />}
                onClick={() => {
                  setShowContact((v) => {
                    if (v) form.setFieldsValue({ contactPerson: undefined, contactEmail: undefined, contactPhone: undefined });
                    return !v;
                  });
                }}
              >
                {t('institutions.action.maintainContact')}
              </Button>
              <Button
                type={showAddress ? 'primary' : 'default'}
                ghost={showAddress}
                icon={<MapPin size={14} />}
                onClick={() => {
                  setShowAddress((v) => {
                    if (v) form.setFieldsValue({ address: undefined });
                    return !v;
                  });
                }}
              >
                {t('institutions.action.maintainAddress')}
              </Button>
            </div>

            {showContact && (
              <>
                <Form.Item label={t('institutions.fields.contactPerson')} name="contactPerson" className="mt-2">
                  <Input placeholder={t('institutions.placeholder.contactPerson')} />
                </Form.Item>
                <Form.Item label={t('institutions.fields.contactEmail')} name="contactEmail" className="mt-2" rules={[{ type: 'email', message: t('validation.emailInvalid') }]}>
                  <Input placeholder={t('institutions.placeholder.contactEmail')} />
                </Form.Item>
                <Form.Item label={t('institutions.fields.contactPhone')} name="contactPhone">
                  <Input placeholder={t('institutions.placeholder.contactPhone')} />
                </Form.Item>
              </>
            )}

            {showAddress && (
              <Form.Item label={t('institutions.fields.address')} name="address" className={showContact ? 'sm:col-span-2' : 'sm:col-span-2 mt-2'}>
                <Input.TextArea rows={3} placeholder={t('institutions.placeholder.address')} />
              </Form.Item>
            )}
          </div>
        </div>
      </Form>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-folio-ink/10 pt-4 dark:border-white/[0.07]">
        <Button onClick={step === 0 ? onCancel : goBack} icon={step === 0 ? undefined : <ArrowLeft size={14} />}>
          {step === 0 ? t('common.cancel') : t('institutions.action.back')}
        </Button>
        {step < 2 ? (
          <Button type="primary" onClick={() => void goNext()}>
            <span className="inline-flex items-center gap-1.5">{t('institutions.action.next')} <ArrowRight size={14} /></span>
          </Button>
        ) : (
          <Button type="primary" loading={saving} onClick={() => void handleFinish().catch(() => {})}>
            {submitText}
          </Button>
        )}
      </div>
    </div>
  );
}
