import { getProfile } from './profile';

let cachedEmail: string | undefined;
let cacheLoaded = false;

export async function getAuditActorEmail(): Promise<string | undefined> {
  if (cacheLoaded) return cachedEmail;
  try {
    const profile = await getProfile();
    cachedEmail = profile?.email?.trim().toLowerCase() || undefined;
    cacheLoaded = true;
    return cachedEmail;
  } catch {
    return undefined;
  }
}

/** @deprecated Prefer getAuditActorEmail; kept for compatibility. Returns audit actor email. */
export async function getCurrentUserId(): Promise<string | undefined> {
  return getAuditActorEmail();
}

export function setAuditActorEmailCache(email: string | undefined): void {
  cachedEmail = email?.trim().toLowerCase() || undefined;
  cacheLoaded = true;
}

export function clearCurrentUserIdCache(): void {
  cachedEmail = undefined;
  cacheLoaded = false;
}
