import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, AutoComplete, Button, DatePicker, Divider, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { CircleEllipsis, Landmark, Plus, Repeat, ShieldCheck, Trash2, User, UserCheck, Users } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import InstitutionFormModal from '../institutions/InstitutionFormModal';
import { institutionLabel } from '../../services/financialInstitutions';
import { listDeposits } from '../../services/deposits';
import { getDateFormatId } from '../../utils/date';
import { profileDisplayName, type DepositJointHolder, type DepositOperationType, type DepositType, type FinancialInstitutionInput } from '../../types';
import {
  ACCOUNT_OPTIONS,
  OPERATION_TYPE_OPTIONS,
  buildJointHolderSuggestions,
  newJointHolder,
  type DepositFormValues,
} from './depositFormModel';

function AccountTypeLabel({ type, label }: { type: DepositType; label: string }) {
  const icons: Partial<Record<DepositType, ReactNode>> = {
    fd: <Landmark size={15} className="text-emerald-600 dark:text-emerald-400" />,
    rd: <Repeat size={15} className="text-sky-600 dark:text-sky-400" />,
    'tax-saving': <ShieldCheck size={15} className="text-violet-600 dark:text-violet-400" />,
    other: <CircleEllipsis size={15} className="text-folio-ink/55 dark:text-white/55" />,
  };
  return <span className="inline-flex items-center gap-2">{icons[type]}<span>{label}</span></span>;
}

function normalizeDepositNumber(value: string): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function operationTypeIcon(type: DepositOperationType): ReactNode {
  if (type === 'single') return <User size={15} className="text-folio-info dark:text-folio-info" />;
  if (type === 'joint') return <Users size={15} className="text-folio-info dark:text-folio-info" />;
  if (type === 'either-or-survivor') return <Users size={15} className="text-violet-600 dark:text-violet-400" />;
  return <UserCheck size={15} className="text-emerald-600 dark:text-emerald-400" />;
}

function holderKey(h: Pick<DepositJointHolder, 'name'>): string {
  return h.name.trim().toLowerCase();
}

export default function DepositWizardStepOverview({ activeLocked = false, terminalLocked = false, isEdit: _isEdit = false }: { activeLocked?: boolean; terminalLocked?: boolean; isEdit?: boolean }) {
  void _isEdit;
  const { t } = useI18n();
  const { profile } = useAuth();
  const { id: editId } = useParams<{ id: string }>();
  const form = Form.useFormInstance<DepositFormValues>();
  const depositNumber = Form.useWatch('depositNumber', form);
  const operationType = (Form.useWatch('operationType', form) ?? 'single') as DepositOperationType;
  const jointHolders = (Form.useWatch('jointHolders', form) ?? []) as Array<{ share?: number }>;
  const [createInstitutionOpen, setCreateInstitutionOpen] = useState(false);
  const [holderSuggestions, setHolderSuggestions] = useState<DepositJointHolder[]>([]);
  const { institutions, create } = useFinancialInstitutions();
  const options = useMemo(
    () => institutions
      .filter((fi) => fi.category === 'savings-account' || fi.category === 'current-account')
      .map((fi) => ({ value: fi.id, label: institutionLabel(fi) })),
    [institutions],
  );

  useEffect(() => {
    const normalized = normalizeDepositNumber(depositNumber ?? '');
    if ((depositNumber ?? '') !== normalized) form.setFieldValue('depositNumber', normalized);
  }, [depositNumber, form]);

  useEffect(() => {
    let active = true;
    listDeposits()
      .then((all) => {
        if (!active) return;
        setHolderSuggestions(buildJointHolderSuggestions(all));
      })
      .catch(() => {
        if (active) setHolderSuggestions([]);
      });
    return () => { active = false; };
  }, []);

  const locked = activeLocked || terminalLocked;
  const showJointHolders = operationType !== 'single';
  const profileName = useMemo(() => {
    const name = profile ? profileDisplayName(profile).trim() : '';
    return name || t('deposit.jointHolder.primaryFallback');
  }, [profile, t]);
  const holderShares = useMemo(() => {
    const otherHoldersTotal = jointHolders.reduce((sum, h) => {
      const n = typeof h?.share === 'number' ? h.share : Number(h?.share);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const roundedOther = Math.round(otherHoldersTotal * 100) / 100;
    const primary = Math.max(0, Math.min(100, Math.round((100 - roundedOther) * 100) / 100));
    return { otherHoldersTotal: roundedOther, primaryShare: primary };
  }, [jointHolders]);

  return (
    <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
      <Form.Item
        name="depositNumber"
        label={t('deposit.fields.depositNumber')}
        className="sm:col-span-2"
        rules={[
          { required: true, message: t('deposit.validation.depositNumberRequired') },
          { pattern: /^[A-Z0-9_-]*$/, message: t('deposit.validation.depositNumberInvalid') },
          {
            validator: async (_, value: string) => {
              const normalized = normalizeDepositNumber(value ?? '');
              if (!normalized) return;
              const all = await listDeposits();
              const dup = all.some((d) => d.id !== editId && normalizeDepositNumber(d.depositNumber ?? '') === normalized);
              if (dup) throw new Error(t('deposit.validation.depositNumberDuplicate'));
            },
          },
        ]}
      >
        <Input maxLength={64} disabled={locked} autoComplete="off" onChange={(e) => form.setFieldValue('depositNumber', normalizeDepositNumber(e.target.value))} />
      </Form.Item>
      <Form.Item name="name" label={t('deposit.fields.name')} className="sm:col-span-2" rules={[{ required: true, whitespace: true, message: t('deposit.validation.nameRequired') }]}>
        <Input maxLength={120} disabled={activeLocked || terminalLocked} autoComplete="off" />
      </Form.Item>
      <Form.Item name="financialInstitutionId" label={t('deposit.fields.institution')} rules={[{ required: true, message: t('deposit.validation.institutionRequired') }]}>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={locked}
          options={options}
          placeholder={t('deposit.placeholder.institution')}
          popupRender={(menu) => (
            <div className="flex flex-col gap-2 p-1">
              <p className="px-2 pb-1 pt-1 text-[11px] leading-snug text-folio-ink/55 dark:text-white/45">
                <span className="font-semibold uppercase tracking-[0.08em] text-folio-info dark:text-folio-info">
                  {t('deposit.institution.dropdownHeader')}
                </span>
                <br />
                {t('deposit.institution.dropdownHint')}
              </p>
              <div className="min-w-0">{menu}</div>
              <Divider style={{ margin: '4px 0' }} />
              <Button type="text" icon={<Plus size={14} />} onClick={() => setCreateInstitutionOpen(true)} className="justify-start">
                {t('deposit.createInstitution')}
              </Button>
            </div>
          )}
          onChange={(id) => {
            const fi = institutions.find((i) => i.id === id);
            if (fi) form.setFieldsValue({ financialInstitutionId: id, bankName: fi.name });
          }}
        />
      </Form.Item>
      <Form.Item name="bankName" hidden><Input /></Form.Item>
      <Form.Item name="accountType" label={t('deposit.fields.accountType')} rules={[{ required: true, message: t('deposit.validation.accountTypeRequired') }]}>
        <Select
          disabled={locked}
          optionLabelProp="label"
          options={ACCOUNT_OPTIONS.map((opt) => {
            const label = t(opt.label);
            return { value: opt.value, label: <AccountTypeLabel type={opt.value} label={label} /> };
          })}
        />
      </Form.Item>

      <Form.Item name="operationType" label={t('deposit.fields.operationType')} rules={[{ required: true, message: t('deposit.validation.operationTypeRequired') }]}>
        <Select
          disabled={locked}
          optionLabelProp="label"
          options={OPERATION_TYPE_OPTIONS.map((opt) => {
            const label = t(opt.label);
            return {
              value: opt.value,
              label: <span className="inline-flex items-center gap-2">{operationTypeIcon(opt.value)}<span>{label}</span></span>,
            };
          })}
          onChange={(v) => {
            if (v === 'single') form.setFieldValue('jointHolders', []);
          }}
        />
      </Form.Item>

      {showJointHolders ? (
        <div className="sm:col-span-2 mt-1 rounded-2xl border border-folio-ink/[0.08] bg-folio-paper/30 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{t('deposit.section.jointHolders')}</h3>
          </div>
          <Alert
            className="folio-message-strip folio-message-strip-info mb-3"
            showIcon
            type="info"
            title={
              <span>
                {(() => {
                  const opLabel = t(OPERATION_TYPE_OPTIONS.find((o) => o.value === operationType)?.label ?? 'deposit.operationType.joint');
                  return <>Since this account is marked as {opLabel}, <strong>{profileName}</strong> would have a share of <strong>{holderShares.primaryShare}%</strong> and remaining share of <strong>{holderShares.otherHoldersTotal}%</strong> is distributed across <strong>{jointHolders.length}</strong> holder{jointHolders.length === 1 ? '' : 's'}.</>;
                })()}
              </span>
            }
          />
          <Form.List
            name="jointHolders"
            rules={[{
              validator: async (_, value) => {
                const arr = Array.isArray(value) ? value : [];
                if (arr.length < 1) throw new Error(t('deposit.validation.jointHolderRequired'));
              },
            }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const holderOpts = holderSuggestions
                    .filter((h) => {
                      const key = holderKey(h);
                      if (!key) return false;
                      const used = (jointHolders as Array<{ name?: string }>).some((x, i) => i !== index && holderKey({ name: x?.name ?? '' }) === key);
                      return !used;
                    })
                    .map((h) => ({
                      value: h.name,
                      label: (
                        <span className="flex items-center justify-between gap-3">
                          <span>{h.name}</span>
                          <span className="text-[11px] text-folio-ink/45 dark:text-white/40">{t('deposit.jointHolder.previouslyUsed')}</span>
                        </span>
                      ),
                      holder: h,
                    }));
                  return (
                    <div key={field.key} className="rounded-xl border border-folio-ink/[0.07] bg-white/60 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                      <div className="grid gap-x-3 gap-y-0 sm:grid-cols-2">
                        <Form.Item
                          name={[field.name, 'name']}
                          label={t('deposit.fields.jointHolderName')}
                          className="sm:col-span-2 mb-2"
                          rules={[
                            { required: true, whitespace: true, message: t('deposit.validation.jointHolderNameRequired') },
                            {
                              validator: (_, v) => {
                                const key = String(v ?? '').trim().toLowerCase();
                                if (!key) return Promise.resolve();
                                const dup = (jointHolders as Array<{ name?: string }>).some((x, i) => i !== index && String(x?.name ?? '').trim().toLowerCase() === key);
                                return dup ? Promise.reject(new Error(t('deposit.validation.jointHolderUnique'))) : Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <AutoComplete
                            disabled={locked}
                            options={holderOpts}
                            placeholder={t('deposit.placeholder.jointHolderName')}
                            filterOption={(input, opt) => String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                            onSelect={(_, opt) => {
                              const h = (opt as { holder?: DepositJointHolder }).holder;
                              if (!h) return;
                              const list = [...(form.getFieldValue('jointHolders') ?? [])] as Array<{ name?: string; dateOfBirth?: dayjs.Dayjs; share?: number }>;
                              list[index] = {
                                name: h.name,
                                dateOfBirth: h.dateOfBirth ? dayjs(h.dateOfBirth) : list[index]?.dateOfBirth,
                                share: Number.isFinite(h.share) ? h.share : list[index]?.share,
                              };
                              form.setFieldValue('jointHolders', list);
                            }}
                          />
                        </Form.Item>
                        <Form.Item name={[field.name, 'dateOfBirth']} label={t('deposit.fields.jointHolderDob')} rules={[{ required: true, message: t('deposit.validation.jointHolderDobRequired') }]}>
                          <DatePicker className="w-full" disabled={locked} format={getDateFormatId()} allowClear />
                        </Form.Item>
                        <Form.Item name={[field.name, 'share']} label={t('deposit.fields.jointHolderShare')} rules={[{ required: true, message: t('deposit.validation.jointHolderShareRequired') }, { type: 'number', min: 1, message: t('deposit.validation.jointHolderShareMin') }, { type: 'number', max: 100, message: t('deposit.validation.jointHolderShareMax') }]}>
                          <InputNumber className="w-full" disabled={locked} min={1} max={100} precision={2} addonAfter="%" placeholder="0.0" />
                        </Form.Item>
                      </div>
                      {!locked ? (
                        <Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={() => remove(field.name)}>
                          {t('deposit.jointHolder.remove')}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
                {!locked && fields.length < 2 ? (
                  <Button type="dashed" icon={<Plus size={14} />} onClick={() => add(newJointHolder())}>
                    {t('deposit.jointHolder.add')}
                  </Button>
                ) : null}
                {showJointHolders && fields.length === 0 ? (
                  <Alert
                    className="folio-message-strip folio-message-strip-error"
                    showIcon
                    type="error"
                    title={t('deposit.jointHolder.empty')}
                  />
                ) : null}
                <Form.ErrorList errors={errors} />
              </div>
            )}
          </Form.List>
        </div>
      ) : null}

      <InstitutionFormModal
        open={createInstitutionOpen}
        institution={null}
        onCancel={() => setCreateInstitutionOpen(false)}
        onSubmit={async (values: FinancialInstitutionInput) => {
          const created = await create(values);
          if (created) form.setFieldsValue({ financialInstitutionId: created.id, bankName: institutionLabel(created) });
          setCreateInstitutionOpen(false);
        }}
      />
    </div>
  );
}
