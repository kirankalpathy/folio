/**
 * Centralized file naming utility for Folio exports.
 *
 * Standard format: `{prefix}_{Type}_{Date}.{ext}` or `{prefix}_{Type}_{Suffix}_{Date}.{ext}`
 * Date format: configurable (default: YYYYMMDD)
 *
 * All generated file names are sanitized to remove characters that are
 * invalid or problematic across operating systems (Windows, macOS, Linux).
 *
 * File name types are configurable via src/config/fileNamingConfig.ts
 */

import dayjs from 'dayjs';
import {
  getFilePrefix,
  getDateFormat,
  getSeparator,
  resolveTypeName,
} from '../config/fileNamingConfig';

/** Characters that are invalid or problematic in file names across OS platforms. */
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|%#^&{}[\]`;=+~]/g;

/** Reserved Windows file names that cannot be used. */
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Sanitize a string for use in a file name.
 * Removes/replaces characters that are invalid across operating systems.
 * Trims leading/trailing spaces and dots (Windows restriction).
 */
export function sanitizeFileNamePart(value: string): string {
  if (!value) return '';
  // Replace invalid characters with underscore
  let sanitized = value.replace(INVALID_FILENAME_CHARS, '_');
  // Replace multiple consecutive underscores with a single one
  sanitized = sanitized.replace(/_+/g, '_');
  // Remove leading/trailing underscores, spaces, and dots
  sanitized = sanitized.replace(/^[_.\s]+|[_.\s]+$/g, '');
  // Ensure it's not a reserved Windows name
  if (RESERVED_NAMES.has(sanitized.toUpperCase())) {
    sanitized = `_${sanitized}`;
  }
  // Limit length (Windows MAX_PATH is 260, leave room for path)
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  return sanitized;
}

/**
 * Generate a date stamp using the configured format (default: YYYYMMDD).
 */
export function dateStamp(date?: Date): string {
  const d = date ?? new Date();
  return dayjs(d).format(getDateFormat());
}

/**
 * Generate a standardized Folio file name.
 *
 * @param typeKey - Internal type key (resolved via config) or display type name
 * @param ext - File extension without dot (e.g., 'json', 'xlsx', 'csv', 'pdf')
 * @param options - Optional: date (defaults to now), suffix (e.g., deposit number)
 * @returns Sanitized file name
 *
 * Examples:
 *   folioFileName('ledgerBackup', 'json') → 'Folio_Ledger_Backup_20261110.json'
 *   folioFileName('depositSummary', 'xlsx') → 'Folio_Deposit_Summary_20261110.xlsx'
 *   folioFileName('depositDetail', 'pdf', { suffix: 'FD-001' }) → 'Folio_Deposit_FD-001_20261110.pdf'
 *   folioFileName('financialInstitutions', 'csv') → 'Folio_Financial_Institutions_20261110.csv'
 */
export function folioFileName(
  typeKey: string,
  ext: string,
  options?: { date?: Date; suffix?: string },
): string {
  const sep = getSeparator();
  const prefix = getFilePrefix();
  const date = options?.date ?? new Date();
  const stamp = dateStamp(date);
  // Resolve type key to display name (falls back to the key itself if not found)
  const typeName = resolveTypeName(typeKey);
  const sanitizedType = sanitizeFileNamePart(typeName);
  const parts = [prefix, sanitizedType];
  if (options?.suffix) {
    parts.push(sanitizeFileNamePart(options.suffix));
  }
  parts.push(stamp);
  const name = parts.join(sep);
  return `${name}.${ext.toLowerCase()}`;
}

/**
 * @deprecated Use `folioFileName` instead. Kept for backward compatibility.
 * Maps old prefix-based calls to the new standardized format.
 */
export function stampName(prefix: string, ext: string): string {
  // Map old prefixes to new config type keys
  const typeMap: Record<string, string> = {
    'folio-deposits': 'depositSummary',
    'folio-deposit-detail': 'depositDetail',
    'folio-institutions': 'financialInstitutions',
    'folio-backup': 'ledgerBackup',
  };
  const typeKey = typeMap[prefix] ?? 'default';
  return folioFileName(typeKey, ext);
}