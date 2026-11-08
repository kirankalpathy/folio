import type { AuthCredential, PasscodeCredential, PasscodeFreeCredential } from '../types';
import { translate } from '../i18n';
import { getRecord, putRecord } from './sqlite';

const CREDENTIAL_ID = 'primary' as const;
const SESSION_KEY = 'folio:session';
const ITERATIONS = 210_000;
const KEY_BITS = 256;
const RECOVERY_VERSION = 1;
const RECOVERY_SALT = new TextEncoder().encode('folio-recovery-v1');

export const MIN_PASSCODE_LENGTH = 6;

export interface RecoveryFileData {
  blob: Blob;
  fileName: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function deriveHash(passcode: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error(translate('errors.auth.secureContext'));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, KEY_BITS);
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function sha256Base64(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error(translate('errors.auth.secureContext'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64(new Uint8Array(digest));
}

async function createRecoveryVerifier(secret: Uint8Array<ArrayBuffer>, ledgerId: string): Promise<string> {
  return sha256Base64(concatBytes(secret, new TextEncoder().encode(ledgerId)));
}

async function deriveRecoveryAesKey(ledgerId: string): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error(translate('errors.auth.secureContext'));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(ledgerId), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: RECOVERY_SALT, iterations: 120_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function buildRecoveryFile(ledgerId: string, secret: Uint8Array<ArrayBuffer>): Promise<RecoveryFileData> {
  const key = await deriveRecoveryAesKey(ledgerId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ secret: bytesToBase64(secret) }));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const payload = {
    v: RECOVERY_VERSION,
    app: 'folio',
    ledgerId,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
  return {
    blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    fileName: 'passkey.json',
  };
}

async function parseRecoveryFile(file: File): Promise<{ ledgerId: string; secret: Uint8Array<ArrayBuffer> }> {
  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error(translate('auth.reset.invalidFile'));
  }
  if (!payload || typeof payload !== 'object') throw new Error(translate('auth.reset.invalidFile'));
  const record = payload as Record<string, unknown>;
  if (record.v !== RECOVERY_VERSION || record.app !== 'folio' || typeof record.ledgerId !== 'string' || typeof record.iv !== 'string' || typeof record.data !== 'string') {
    throw new Error(translate('auth.reset.invalidFile'));
  }
  try {
    const key = await deriveRecoveryAesKey(record.ledgerId);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(record.iv) },
      key,
      base64ToBytes(record.data),
    );
    const inner = JSON.parse(new TextDecoder().decode(decrypted)) as { secret?: unknown };
    if (typeof inner.secret !== 'string') throw new Error(translate('auth.reset.invalidFile'));
    return { ledgerId: record.ledgerId, secret: base64ToBytes(inner.secret) };
  } catch (error) {
    if (error instanceof Error && error.message === translate('auth.reset.invalidFile')) throw error;
    throw new Error(translate('auth.reset.invalidFile'));
  }
}

export function assertPasscode(passcode: string): void {
  if (passcode.length < MIN_PASSCODE_LENGTH) {
    throw new Error(translate('errors.auth.passcodeLength', { count: MIN_PASSCODE_LENGTH }));
  }
}

export async function getCredential(): Promise<AuthCredential | null> {
  return getRecord<AuthCredential>('credentials', CREDENTIAL_ID);
}

export function isPasscodeFree(credential: AuthCredential | null): credential is PasscodeFreeCredential {
  return credential?.kind === 'none';
}

export function hasRecovery(credential: AuthCredential | null): credential is PasscodeCredential & { ledgerId: string; recoveryVerifier: string } {
  return Boolean(credential && credential.kind !== 'none' && credential.ledgerId && credential.recoveryVerifier);
}

export async function createCredential(
  passcode: string,
): Promise<{ credential: PasscodeCredential; recoveryFile: RecoveryFileData }> {
  assertPasscode(passcode);
  const existing = await getCredential();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ledgerId = crypto.randomUUID();
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const now = new Date().toISOString();
  const credential: PasscodeCredential = {
    id: CREDENTIAL_ID,
    kind: 'passcode',
    salt: bytesToBase64(salt),
    hash: await deriveHash(passcode, salt, ITERATIONS),
    iterations: ITERATIONS,
    ledgerId,
    recoveryVerifier: await createRecoveryVerifier(secret, ledgerId),
    recoveryAcknowledged: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putRecord('credentials', credential.id, credential);
  return { credential, recoveryFile: await buildRecoveryFile(ledgerId, secret) };
}

export async function updatePasscode(passcode: string): Promise<PasscodeCredential> {
  assertPasscode(passcode);
  const existing = await getCredential();
  if (!existing || existing.kind === 'none') throw new Error(translate('errors.auth.passcodeNotEnabled'));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const now = new Date().toISOString();
  let ledgerId = existing.ledgerId;
  let recoveryVerifier = existing.recoveryVerifier;
  if (!ledgerId || !recoveryVerifier) {
    ledgerId = crypto.randomUUID();
    recoveryVerifier = await createRecoveryVerifier(crypto.getRandomValues(new Uint8Array(32)), ledgerId);
  }
  const credential: PasscodeCredential = {
    ...existing,
    kind: 'passcode',
    salt: bytesToBase64(salt),
    hash: await deriveHash(passcode, salt, ITERATIONS),
    iterations: ITERATIONS,
    ledgerId,
    recoveryVerifier,
    updatedAt: now,
  };
  await putRecord('credentials', credential.id, credential);
  return credential;
}

export async function createPasscodeFreeCredential(): Promise<PasscodeFreeCredential> {
  const existing = await getCredential();
  const now = new Date().toISOString();
  const credential: PasscodeFreeCredential = {
    id: CREDENTIAL_ID,
    kind: 'none',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putRecord('credentials', credential.id, credential);
  return credential;
}

export async function disablePasscode(currentPasscode: string): Promise<void> {
  const valid = await verifyPasscode(currentPasscode);
  if (!valid) throw new Error(translate('errors.auth.currentIncorrect'));
  await createPasscodeFreeCredential();
}

export async function enablePasscode(newPasscode: string): Promise<RecoveryFileData> {
  const result = await createCredential(newPasscode);
  return result.recoveryFile;
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const credential = await getCredential();
  if (!credential || credential.kind === 'none') return false;
  const candidate = await deriveHash(passcode, base64ToBytes(credential.salt), credential.iterations);
  return constantTimeEqual(candidate, credential.hash);
}

export async function acknowledgeRecovery(): Promise<void> {
  const credential = await getCredential();
  if (!credential || credential.kind === 'none') return;
  await putRecord('credentials', credential.id, { ...credential, recoveryAcknowledged: true, updatedAt: new Date().toISOString() });
}

export async function validateRecoveryFile(file: File): Promise<void> {
  const credential = await getCredential();
  if (!credential || credential.kind === 'none' || !credential.ledgerId || !credential.recoveryVerifier) {
    throw new Error(translate('auth.reset.unavailable'));
  }
  const parsed = await parseRecoveryFile(file);
  if (parsed.ledgerId !== credential.ledgerId) throw new Error(translate('auth.reset.invalidFile'));
  const verifier = await createRecoveryVerifier(parsed.secret, parsed.ledgerId);
  if (!constantTimeEqual(verifier, credential.recoveryVerifier)) {
    throw new Error(translate('auth.reset.invalidFile'));
  }
}

export async function resetPasscodeWithRecovery(file: File, newPasscode: string): Promise<void> {
  assertPasscode(newPasscode);
  await validateRecoveryFile(file);
  const credential = await getCredential();
  if (!credential || credential.kind === 'none' || !credential.ledgerId || !credential.recoveryVerifier) {
    throw new Error(translate('auth.reset.unavailable'));
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const now = new Date().toISOString();
  await putRecord('credentials', credential.id, {
    ...credential,
    kind: 'passcode',
    salt: bytesToBase64(salt),
    hash: await deriveHash(newPasscode, salt, ITERATIONS),
    iterations: ITERATIONS,
    recoveryAcknowledged: true,
    updatedAt: now,
  });
}

export function isSessionUnlocked(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === 'unlocked'; } catch { return false; }
}

export function markSessionUnlocked(): void {
  try { sessionStorage.setItem(SESSION_KEY, 'unlocked'); } catch { /* convenience */ }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* no-op */ }
}
