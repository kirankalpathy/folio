import type { ProfileInput, UserProfile } from '../types';
import { translate } from '../i18n';
import { getRecord, putRecord, updateAuditActorInAllTables } from './sqlite';
import { setAuditActorEmailCache } from './currentUser';

export const PROFILE_ID = 'primary';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function splitLegacyName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function normalizeStoredProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.id !== PROFILE_ID || typeof r.email !== 'string') return null;
  let firstName = typeof r.firstName === 'string' ? r.firstName : '';
  let lastName = typeof r.lastName === 'string' ? r.lastName : '';
  if (!firstName && !lastName && typeof r.fullName === 'string') {
    const split = splitLegacyName(r.fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  const now = new Date().toISOString();
  const createdAt = typeof r.createdAt === 'string' ? r.createdAt : now;
  const updatedAt = typeof r.updatedAt === 'string' ? r.updatedAt : createdAt;
  const userId = typeof r.userId === 'string' && r.userId.trim() ? r.userId.trim() : crypto.randomUUID();
  return {
    id: PROFILE_ID,
    userId,
    firstName,
    lastName,
    email: typeof r.email === 'string' ? r.email : '',
    phone: typeof r.phone === 'string' && r.phone ? r.phone : undefined,
    city: typeof r.city === 'string' && r.city ? r.city : undefined,
    photo: typeof r.photo === 'string' && r.photo ? r.photo : undefined,
    createdAt,
    updatedAt,
    changedAt: typeof r.changedAt === 'string' ? r.changedAt : updatedAt,
  };
}

function assertProfileInput(input: ProfileInput): void {
  if (input.firstName.trim().length < 1) throw new Error(translate('errors.profile.firstName'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(input.email))) {
    throw new Error(translate('errors.profile.email'));
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await getRecord<unknown>('profile', PROFILE_ID);
  return normalizeStoredProfile(raw);
}

export async function saveProfile(input: ProfileInput): Promise<UserProfile> {
  assertProfileInput(input);
  const existing = await getProfile();
  const now = new Date().toISOString();
  const photo = input.photo === null ? undefined : (input.photo?.trim() || existing?.photo);
  const userId = existing?.userId ?? crypto.randomUUID();
  const nextEmail = normalizeEmail(input.email);
  const oldEmail = existing?.email ? normalizeEmail(existing.email) : undefined;

  const profile: UserProfile = {
    id: PROFILE_ID,
    userId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: nextEmail,
    phone: input.phone?.trim() || undefined,
    city: input.city?.trim() || undefined,
    photo,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    changedAt: now,
  };
  await putRecord('profile', profile.id, profile);

  // Propagate profile email changes to audit actors (createdBy/changedBy) across audited records.
  if (oldEmail && oldEmail !== nextEmail) {
    try {
      await updateAuditActorInAllTables([oldEmail, userId].filter(Boolean), nextEmail);
    } catch {
      // Non-fatal: profile is saved; audit propagation can be retried on next save or by migration.
    }
  }
  setAuditActorEmailCache(nextEmail);
  return profile;
}
