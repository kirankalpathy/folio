import { useEffect, useState, type ReactNode } from 'react';
import { Descriptions } from 'antd';
import type { DescriptionsProps } from 'antd';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/date';
import type { AuditFields, UserProfile } from '../../types';
import { getProfile } from '../../services/profile';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-3 dark:border-white/[0.07]">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function val(v?: string | null): ReactNode {
  if (v === undefined || v === null || v === '') return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  return <span className="break-words whitespace-normal">{String(v)}</span>;
}

function displayName(profile: UserProfile | null | undefined): string | undefined {
  if (!profile) return undefined;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return name || profile.email || undefined;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export default function ChangeDetailsSection({
  record,
  descriptionsProps,
}: {
  record: Partial<AuditFields> & { updatedAt?: string };
  descriptionsProps?: Partial<DescriptionsProps>;
}) {
  const { t } = useI18n();
  const { profile: authProfile } = useAuth();
  const [dbProfile, setDbProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;
    void getProfile().then((p) => {
      if (active) setDbProfile(p);
    }).catch(() => { /* non-blocking: audit display only */ });
    return () => { active = false; };
  }, []);

  const resolveUser = (actor?: string | null): string | undefined => {
    if (!actor) return undefined;
    const value = actor.trim();
    if (!value) return undefined;

    // Audit actors are stored as email IDs (cross-app portable). Resolve to profile full name when possible.
    const profiles = [authProfile, dbProfile].filter((p): p is UserProfile => !!p);
    if (value.includes('@')) {
      const email = normalizeEmail(value);
      for (const p of profiles) {
        if (p.email && normalizeEmail(p.email) === email) return displayName(p);
      }
      // If not resolved, show the email ID as-is.
      return value;
    }

    // Legacy UUID actors (pre-migration): resolve via profile userId; never display raw UUIDs.
    if (isUuidLike(value)) {
      for (const p of profiles) {
        if (p.userId && p.userId === value) return displayName(p);
      }
      return undefined;
    }

    // Unknown non-email identifier: avoid showing raw internal IDs.
    return undefined;
  };

  const createdOn = formatDateTime(record.createdAt);
  const changedOn = formatDateTime(record.changedAt ?? record.updatedAt);
  const createdBy = resolveUser(record.createdBy);
  const changedBy = resolveUser(record.changedBy);

  const dp: Partial<DescriptionsProps> = {
    layout: 'vertical',
    column: { xs: 1, sm: 2 },
    size: 'small',
    colon: false,
    ...descriptionsProps,
  };

  return (
    <Section title={t('common.changeDetails')}>
      <Descriptions
        {...dp}
        items={[
          { key: 'createdBy', label: t('common.createdBy'), children: val(createdBy) },
          { key: 'createdOn', label: t('common.createdOn'), children: val(createdOn === '—' ? undefined : createdOn) },
          { key: 'changedBy', label: t('common.changedBy'), children: val(changedBy) },
          { key: 'changedOn', label: t('common.changedOn'), children: val(changedOn === '—' ? undefined : changedOn) },
        ]}
      />
    </Section>
  );
}
