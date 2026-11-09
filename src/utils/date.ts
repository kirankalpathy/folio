export type DateFormatId = 'DD MMM YYYY' | 'MMM DD YYYY';

export const DATE_FORMAT_OPTIONS: Array<{ id: DateFormatId; label: string }> = [
  { id: 'DD MMM YYYY', label: '01 Jan 2026' },
  { id: 'MMM DD YYYY', label: 'Jan 01 2026' },
];

let activeDateFormatId: DateFormatId = 'DD MMM YYYY';

export function getDateFormatId(): DateFormatId {
  return activeDateFormatId;
}

export function setDateFormat(id: DateFormatId): void {
  activeDateFormatId = id === 'MMM DD YYYY' ? 'MMM DD YYYY' : 'DD MMM YYYY';
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()] ?? '';
  const year = date.getFullYear();
  return activeDateFormatId === 'MMM DD YYYY' ? `${month} ${day} ${year}` : `${day} ${month} ${year}`;
}

export function parseLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

export function formatDate(value: string): string {
  if (!value) return '—';
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? '—' : formatShortDate(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()] ?? '';
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const datePart = activeDateFormatId === 'MMM DD YYYY' ? `${month} ${day} ${year}` : `${day} ${month} ${year}`;
  return `${datePart}, ${time}`;
}

export function formatLongDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function daysUntil(value: string, asOf: Date = new Date()): number {
  const target = parseLocalDate(value).getTime();
  if (Number.isNaN(target)) return Number.NaN;

  const start = new Date(asOf);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((target - start.getTime()) / 86_400_000);
}

export function formatRelativeDays(value: string, asOf: Date = new Date()): string {
  const days = daysUntil(value, asOf);
  if (!Number.isFinite(days)) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  if (days === -1) return 'Yesterday';
  return `${Math.abs(days)} days ago`;
}

export function yearsBetween(start: string, end: string): number {
  const startDate = parseLocalDate(start).getTime();
  const endDate = parseLocalDate(end).getTime();
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate <= startDate) {
    return 0;
  }
  return (endDate - startDate) / (365.25 * 86_400_000);
}
