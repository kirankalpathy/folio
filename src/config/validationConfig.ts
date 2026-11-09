import dayjs, { type Dayjs } from 'dayjs';
import validations from './validations.json';

export interface DatePickerValidationConfig {
  min: string;
  max: string;
}

export interface DobValidationConfig {
  allowFuture: boolean;
}

export interface ValidationConfig {
  datePicker: DatePickerValidationConfig;
  dob: DobValidationConfig;
}

const config = validations as ValidationConfig;

export const DATE_PICKER_MIN = dayjs(config.datePicker.min).startOf('day');
export const DATE_PICKER_MAX = dayjs(config.datePicker.max).endOf('day');

export function isDateOutsidePickerBounds(date: Dayjs): boolean {
  return date.isBefore(DATE_PICKER_MIN, 'day') || date.isAfter(DATE_PICKER_MAX, 'day');
}

export function isDobDisabled(date: Dayjs): boolean {
  if (isDateOutsidePickerBounds(date)) return true;
  if (!config.dob.allowFuture && date.isAfter(dayjs(), 'day')) return true;
  return false;
}
