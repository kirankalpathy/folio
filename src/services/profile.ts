import type { ProfileInput, UserProfile } from '../types';
import { translate } from '../i18n';
import { getRecord, putRecord } from './sqlite';

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
  return {
    id: PROFILE_ID,
    firstName,
    lastName,
    email: typeof r.email === 'string' ? r.email : '',
    phone: typeof r.phone === 'string' && r.phone ? r.phone : undefined,
    city: typeof r.city === 'string' && r.city ? r.city : undefined,
    photo: typeof r.photo === 'string' && r.photo ? r.photo : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
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
  const profile: UserProfile = {
    id: PROFILE_ID,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || undefined,
    city: input.city?.trim() || undefined,
    photo,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putRecord('profile', profile.id, profile);
  return profile;
}
