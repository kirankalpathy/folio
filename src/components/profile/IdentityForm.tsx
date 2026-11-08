import { useEffect, useRef, useState } from 'react';
import { Alert, Form, Input } from 'antd';
import { UserRound } from 'lucide-react';
import type { ProfileInput } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import ProfilePhotoField from './ProfilePhotoField';

type IdentityValues = Omit<ProfileInput, 'photo' | 'city'> & { photo?: string | null };

function toNationalPhone(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function normalize(values: Partial<IdentityValues>): Omit<ProfileInput, 'photo' | 'city'> & { photo?: string | null } {
  const phoneDigits = (values.phone ?? '').replace(/\D/g, '').slice(0, 10);
  return {
    firstName: (values.firstName ?? '').trim(),
    lastName: (values.lastName ?? '').trim(),
    email: (values.email ?? '').trim(),
    phone: phoneDigits.length === 10 ? `+91${phoneDigits}` : '',
    photo: values.photo ?? null,
  };
}

export default function IdentityForm() {
  const { profile, updateProfile } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm<IdentityValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = Form.useWatch('photo', form);
  const hydratingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!profile) return;
    hydratingRef.current = true;
    const next: IdentityValues = {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      phone: toNationalPhone(profile.phone),
      photo: profile.photo ?? null,
    };
    form.setFieldsValue(next);
    lastSavedRef.current = JSON.stringify(normalize(next));
    const id = setTimeout(() => {
      hydratingRef.current = false;
    }, 0);
    return () => clearTimeout(id);
  }, [form, profile]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const persist = async (values: IdentityValues) => {
    const payload = normalize(values);
    const key = JSON.stringify(payload);
    if (key === lastSavedRef.current) return;
    if (!payload.firstName || !payload.email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return;
    const phoneDigits = (values.phone ?? '').replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(payload);
      lastSavedRef.current = key;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('profile.identity.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleValuesChange = (_: Partial<IdentityValues>, allValues: IdentityValues) => {
    if (hydratingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist(allValues);
    }, 600);
  };

  const handlePhotoChange = (p: string | null) => {
    form.setFieldValue('photo', p);
    if (hydratingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist(form.getFieldsValue(true));
    }, 0);
  };

  return (
    <section className="folio-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-folio-primary/[0.08] text-folio-primary dark:bg-folio-primary/15 dark:text-folio-accent">
          <UserRound size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t('profile.identity.title')}</h2>
            {saving && <span className="text-[11px] text-folio-ink/45 dark:text-white/40">{t('common.saving')}</span>}
          </div>
          <p className="mt-1 text-[12px] leading-5 text-folio-ink/55 dark:text-white/50">
            {t('profile.identity.description')}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {error && <Alert type="error" showIcon title={error} className="mb-4" closable onClose={() => setError(null)} />}
        <Form<IdentityValues> form={form} layout="vertical" requiredMark onValuesChange={handleValuesChange} autoComplete="off">
          <ProfilePhotoField profile={profile} photo={photo} onChange={handlePhotoChange} />
          <Form.Item name="photo" hidden><Input /></Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item label={t('form.firstName')} name="firstName" rules={[{ required: true, whitespace: true, message: t('validation.firstNameRequired') }]}><Input placeholder={t('placeholder.firstName')} maxLength={60} /></Form.Item>
            <Form.Item label={t('form.lastName')} name="lastName"><Input placeholder={t('placeholder.lastName')} maxLength={60} /></Form.Item>
            <Form.Item label={t('form.email')} name="email" rules={[{ required: true, whitespace: true, message: t('validation.emailRequired') }, { type: 'email', message: t('validation.emailInvalid') }]}><Input maxLength={120} /></Form.Item>
            <Form.Item
              label={t('form.phone')}
              name="phone"
              rules={[{ validator: async (_, value: string | undefined) => { const digits = (value ?? '').replace(/\D/g, ''); if (!digits || digits.length === 10) return; throw new Error(t('validation.phoneDigits')); } }]}
            >
              <Input
                addonBefore={(
                  <span className="inline-flex items-center gap-1.5 text-[12px]">
                    <svg aria-hidden="true" width="18" height="12" viewBox="0 0 18 12" className="overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/10" xmlns="http://www.w3.org/2000/svg">
                      <rect width="18" height="4" y="0" fill="#FF9933" />
                      <rect width="18" height="4" y="4" fill="#FFFFFF" />
                      <rect width="18" height="4" y="8" fill="#138808" />
                      <circle cx="9" cy="6" r="1.35" fill="none" stroke="#000080" strokeWidth="0.35" />
                      <circle cx="9" cy="6" r="0.2" fill="#000080" />
                    </svg>
                    <span>+91</span>
                  </span>
                )}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => form.setFieldValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </Form.Item>
          </div>
        </Form>
      </div>
    </section>
  );
}
