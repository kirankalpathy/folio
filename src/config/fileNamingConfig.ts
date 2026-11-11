/**
 * Configuration for standardized file naming across Folio exports.
 *
 * All file names follow the format: `{prefix}_{type}_{suffix}_{date}.{ext}`
 * where:
 *   - prefix: application name (default: "Folio")
 *   - type: export type (e.g., "Ledger_Backup", "Deposit_Summary")
 *   - suffix: optional identifier (e.g., deposit number)
 *   - date: date stamp in configured format (default: YYYYMMDD)
 *   - ext: file extension
 *
 * Modify this file to change file naming conventions without touching export logic.
 */

export interface FileNameConfig {
  /** Application name prefix for all exported files. */
  prefix: string;
  /** Date format for the date stamp. Uses dayjs format tokens. */
  dateFormat: string;
  /** Separator between name parts. */
  separator: string;
  /** File name type mappings. Key = internal type, Value = display type. */
  types: Record<string, string>;
}

const config: FileNameConfig = {
  prefix: 'Folio',
  dateFormat: 'YYYYMMDD',
  separator: '_',
  types: {
    // Backup
    ledgerBackup: 'Ledger_Backup',
    restoreErrorLog: 'Restore_Error_Log',
    // Deposits
    depositSummary: 'Deposit_Summary',
    depositDetail: 'Deposit',
    // Financial Institutions
    financialInstitutions: 'Financial_Institutions',
    // Generic fallback
    default: 'Export',
  },
};

export default config;

/** Get the configured prefix. */
export function getFilePrefix(): string {
  return config.prefix;
}

/** Get the configured date format. */
export function getDateFormat(): string {
  return config.dateFormat;
}

/** Get the configured separator. */
export function getSeparator(): string {
  return config.separator;
}

/** Resolve an internal type key to its display type name. */
export function resolveTypeName(typeKey: string): string {
  return config.types[typeKey] ?? config.types['default'] ?? 'Export';
}

/** Get all configured type keys. */
export function getTypeKeys(): string[] {
  return Object.keys(config.types);
}