import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { listDeposits } from '../../services/deposits';
import type { DepositNominee } from '../../types';
import { NOMINEE_RELATIONSHIP_OPTIONS, type DepositFormValues } from './depositFormModel';

function nomineeKey(n: Pick<DepositNominee, 'name'>): string {
  return n.name.trim().toLowerCase();
}

export default function DepositWizardStepAdditional({ activeLocked: _activeLocked = false, terminalLocked = false }: { activeLocked?: boolean; terminalLocked?: boolean }) {
  const { t } = useI18n();
  const form = Form.useFormInstance<DepositFormValues>();
  const nominees = Form.useWatch('nominees', form) ?? [];
  const locked = terminalLocked;
  const required = t('validation.required');
  const [suggestions, setSuggestions] = useState<DepositNominee[]>([]);

  useEffect(() => {
    let alive = true;
    void listDeposits().then((deposits) => {
      if (!alive) return;
      const map = new Map<string, DepositNominee>();
      for (const d of deposits) {
        for (const n of d.nominees ?? []) {
          const k = nomineeKey(n);
          if (k && !map.has(k)) map.set(k, n);
        }
      }
      setSuggestions(Array.from(map.values()));
    }).catch(() => { if (alive) setSuggestions([]); });
    return () => { alive = false; };
  }, []);

  const suggestionOptions = useMemo(() => {
    if (suggestions.length === 0) return [];
    return [{
      label: t('deposit.nominee.previouslyUsed'),
      options: suggestions.map((n) => ({ value: n.name, label: n.name, nominee: n })),
    }];
  }, [suggestions, t]);

  const totalShare = useMemo(
    () => (nominees as Array<{ share?: number }>).reduce((sum, n) => sum + (Number.isFinite(n?.share) ? Number(n.share) : 0), 0),
    [nominees],
  );

  const applySuggestion = (index: number, name: string) => {
    const match = suggestions.find((s) => nomineeKey(s) === nomineeKey({ name }));
    if (!match) return;
    const current = form.getFieldValue('nominees') as DepositFormValues['nominees'] | undefined;
    const existing = current?.[index];
    if (!current || !existing) return;
    const next = [...current];
    next[index] = {
      ...existing,
      name: match.name,
      relationship: match.relationship || existing.relationship || 'other',
      dateOfBirth: match.dateOfBirth ? dayjs(match.dateOfBirth) : existing.dateOfBirth,
      share: Number.isFinite(existing.share) ? existing.share : 0,
    };
    form.setFieldsValue({ nominees: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-folio-ink dark:text-[#F3F4F6]">{t('deposit.section.nominees')}</h3>
            <p className="text-[11px] text-folio-ink/50 dark:text-white/45">{t('deposit.nominee.optionalHint')}</p>
          </div>
        </div>

        <Form.List
          name="nominees"
          rules={[{
            validator: async (_, value) => {
              const list = (value ?? []) as Array<{ name?: string; share?: number }>;
              const active = list.filter((n) => n?.name?.trim());
              if (active.length === 0) return;
              const keys = active.map((n) => (n.name ?? '').trim().toLowerCase());
              if (new Set(keys).size !== keys.length) throw new Error(t('deposit.validation.nomineeUnique'));
              const total = active.reduce((s, n) => s + (Number.isFinite(n.share) ? Number(n.share) : 0), 0);
              if (Math.abs(total - 100) > 0.001) throw new Error(t('deposit.validation.nomineeShareTotal'));
            },
          }]}
        >
          {(fields, { add, remove }, { errors }) => (
            <div className="space-y-3">
              {fields.length > 0 && (
                <div className={`text-xs ${Math.abs(totalShare - 100) > 0.001 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {t('deposit.nominee.totalShare')}: <span className="font-mono font-semibold tabular-nums">{totalShare.toFixed(2)}%</span>
                </div>
              )}
              {fields.length === 0 && (
                <div className="rounded-xl border border-dashed border-folio-ink/15 px-3 py-4 text-center text-xs text-folio-ink/45 dark:border-white/15 dark:text-white/40">
                  {t('deposit.nominee.empty')}
                </div>
              )}
              {fields.map((field) => (
                <div key={field.key} className="rounded-xl border border-folio-ink/[0.07] bg-folio-paper/30 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
                  <div className="grid gap-x-3 sm:grid-cols-2">
                    <Form.Item {...field} label={t('deposit.fields.nomineeName')} name={[field.name, 'name']} rules={[{ required: true, whitespace: true, message: required }]}>
                      <AutoComplete
                        disabled={locked}
                        options={suggestionOptions}
                        placeholder={t('deposit.placeholder.nomineeName')}
                        filterOption={(input, option) => {
                          const value = (option as { value?: string } | undefined)?.value;
                          return typeof value === 'string' ? value.toLowerCase().includes(input.toLowerCase()) : false;
                        }}
                        onSelect={(value) => applySuggestion(field.name, String(value))}
                      />
                    </Form.Item>
                    <Form.Item {...field} label={t('deposit.fields.nomineeRelationship')} name={[field.name, 'relationship']} rules={[{ required: true, message: required }]}>
                      <Select disabled={locked} placeholder={t('deposit.placeholder.nomineeRelationship')} options={NOMINEE_RELATIONSHIP_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
                    </Form.Item>
                    <Form.Item {...field} label={t('deposit.fields.nomineeDob')} name={[field.name, 'dateOfBirth']}>
                      <DatePicker disabled={locked} className="w-full" format="DD MMM YYYY" />
                    </Form.Item>
                    <Form.Item {...field} label={t('deposit.fields.nomineeShare')} name={[field.name, 'share']} rules={[{ required: true, message: required }, { type: 'number', min: 0, max: 100, message: t('deposit.validation.nomineeShareMax') }]}>
                      <InputNumber disabled={locked} className="w-full" min={0} max={100} precision={2} suffix="%" />
                    </Form.Item>
                  </div>
                  {!locked && (
                    <div className="flex justify-end">
                      <Button danger type="text" size="small" icon={<Trash2 size={14} />} onClick={() => remove(field.name)}>{t('deposit.nominee.remove')}</Button>
                    </div>
                  )}
                </div>
              ))}
              {errors.length > 0 && <div className="text-xs text-red-500">{errors}</div>}
              {!locked && (
                <Button type="dashed" block icon={<Plus size={14} />} onClick={() => add({ name: '', relationship: 'spouse', share: 0 })}>
                  {t('deposit.nominee.add')}
                </Button>
              )}
            </div>
          )}
        </Form.List>
      </div>

      <Form.Item label={t('deposit.fields.notes')} name="notes" className="mb-0">
        <Input.TextArea disabled={locked} rows={2} maxLength={240} placeholder={t('deposit.placeholder.notes')} />
      </Form.Item>
    </div>
  );
}
