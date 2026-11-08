import type { UserProfile } from '../types';
import { profileDisplayName } from '../types';

type ProfileName = Pick<UserProfile, 'firstName' | 'lastName'> & { fullName?: string };

export function getInitials(profile: ProfileName): string {
  const first = profile.firstName?.trim();
  const last = profile.lastName?.trim();
  if (first || last) return `${first?.[0] ?? ''}${last?.[0] ?? first?.[1] ?? ''}`.toUpperCase() || 'F';
  const parts = profileDisplayName(profile).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'F';
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? 'F';
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function getFirstName(profile: ProfileName | string): string {
  if (typeof profile === 'string') return profile.trim().split(/\s+/)[0] ?? 'there';
  const first = profile.firstName?.trim();
  if (first) return first;
  return profileDisplayName(profile).split(/\s+/)[0] ?? 'there';
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
