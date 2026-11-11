import { useEffect, useRef, useState } from 'react';
import { Alert, Form, Input } from 'antd';
import type { ProfileInput } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import ProfilePhotoField from './ProfilePhotoField';
import MobileInput, { formatMobileE164, mobileInputRules, normalizeMobileDigits } from '../common/MobileInput';

type IdentityValues = Omit<ProfileInput, 'photo' | 'city'> & { photo?: string | null };

function normalize(values: Partial<IdentityValues>): Omit<ProfileInput, 'photo' | 'city'> & { photo?: string | null } {
  return {
    firstName: (values.firstName ?? '').trim(),
    lastName: (values.lastName ?? '').trim(),
    email: (values.email ?? '').trim(),
    phone: formatMobileE164(values.phone) ?? '',
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
      phone: normalizeMobileDigits(profile.phone),
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
    const phoneDigits = normalizeMobileDigits(values.phone);
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
    <div className="space-y-4">
      {saving && (
        <div className="flex justify-end">
          <span className="text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{t('common.saving')}</span>
        </div>
      )}
      {error && <Alert type="error" showIcon title={error} closable onClose={() => setError(null)} />}
      <Form<IdentityValues> form={form} layout="vertical" requiredMark onValuesChange={handleValuesChange} autoComplete="off" className="[&_.ant-form-item]:mb-0">
        <div className="space-y-4">
          <div className="flex justify-center pb-1">
            <div>
              <ProfilePhotoField profile={profile} photo={photo} onChange={handlePhotoChange} />
              <Form.Item name="photo" hidden><Input /></Form.Item>
            </div>
          </div>
          <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
            <div className="grid gap-4 py-3 first:pt-0 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('form.firstName')}</label>
                <Form.Item name="firstName" className="!mb-0" rules={[{ required: true, whitespace: true, message: t('validation.firstNameRequired') }]}>
                  <Input placeholder={t('placeholder.firstName')} maxLength={60} />
                </Form.Item>
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('form.lastName')}</label>
                <Form.Item name="lastName" className="!mb-0">
                  <Input placeholder={t('placeholder.lastName')} maxLength={60} />
                </Form.Item>
              </div>
            </div>
            <div className="grid gap-4 py-3 last:pb-0 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('form.email')}</label>
                <Form.Item name="email" className="!mb-0" rules={[{ required: true, whitespace: true, message: t('validation.emailRequired') }, { type: 'email', message: t('validation.emailInvalid') }]}>
                  <Input maxLength={120} />
                </Form.Item>
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('form.phone')}</label>
                <Form.Item name="phone" className="!mb-0" rules={mobileInputRules(t as never)}>
                  <MobileInput />
                </Form.Item>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
