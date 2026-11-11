import type { InputProps } from 'antd';
import { Input } from 'antd';
import type { Rule } from 'antd/es/form';
import { INDIA_FLAG_COLORS } from '../../theme/palette';

/** Returns only the 10 national mobile digits (strips +91/91/non-digits). */
export function normalizeMobileDigits(value?: string | null): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10);
}

/** Formats 10 digits for storage/display with +91 prefix, or returns empty. */
export function formatMobileE164(digitsOrValue?: string | null): string | undefined {
  const digits = normalizeMobileDigits(digitsOrValue);
  return digits.length === 10 ? `+91${digits}` : undefined;
}

/** Consistent AntD Form rules for 10-digit Indian mobile numbers. */
export function mobileInputRules(
  t: (key: string, params?: Record<string, string | number>) => string,
  opts?: { required?: boolean; requiredMessageKey?: string; requiredMessage?: string; digitsMessageKey?: string },
): Rule[] {
  const requiredMessage = opts?.requiredMessage ?? (opts?.requiredMessageKey ? t(opts.requiredMessageKey) : undefined);
  const digitsMessage = t(opts?.digitsMessageKey ?? 'validation.phoneDigits');
  const rules: Rule[] = [];
  if (opts?.required) {
    rules.push({
      required: true,
      message: requiredMessage ?? digitsMessage,
    });
  }
  rules.push({
    validator: async (_: unknown, value: string | undefined) => {
      const digits = normalizeMobileDigits(value);
      if (!digits) {
        if (opts?.required) throw new Error(requiredMessage ?? digitsMessage);
        return;
      }
      if (digits.length !== 10) throw new Error(digitsMessage);
    },
  });
  return rules;
}

type MobileInputProps = Omit<InputProps, 'value' | 'onChange' | 'addonBefore' | 'maxLength' | 'inputMode'> & {
  /** 10-digit national number (or value containing digits; normalized on change). */
  value?: string | null;
  onChange?: (digits: string) => void;
};

export default function MobileInput({ value, onChange, ...rest }: MobileInputProps) {
  return (
    <Input
      {...rest}
      value={normalizeMobileDigits(value)}
      inputMode="numeric"
      maxLength={10}
      addonBefore={
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.75rem] leading-none">
          <svg aria-hidden="true" width="18" height="12" viewBox="0 0 18 12" className="shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/10">
            <rect width="18" height="4" y="0" fill={INDIA_FLAG_COLORS.saffron} />
            <rect width="18" height="4" y="4" fill={INDIA_FLAG_COLORS.white} />
            <rect width="18" height="4" y="8" fill={INDIA_FLAG_COLORS.green} />
            <circle cx="9" cy="6" r="1.35" fill="none" stroke={INDIA_FLAG_COLORS.navy} strokeWidth="0.35" />
            <circle cx="9" cy="6" r="0.2" fill={INDIA_FLAG_COLORS.navy} />
          </svg>
          <span>+91</span>
        </span>
      }
      onChange={(e) => onChange?.(e.target.value.replace(/\D/g, '').slice(0, 10))}
    />
  );
}
