import { InputNumber, type InputNumberProps } from 'antd';
import { forwardRef } from 'react';
import { formatAmountInWords, type NumberWordSystem } from '../../utils/finance';

type Props = InputNumberProps & {
  /** Show amount in words below the input when value is a positive finite number. */
  showAmountWords?: boolean;
  /** Number word system override. Defaults to the active number format's system. */
  wordSystem?: NumberWordSystem;
  /** Minimum absolute value (exclusive of 0 by default behavior) to show words for. Defaults to showing when value > 0. */
  wordsMin?: number;
};

const AmountInputNumber = forwardRef<any, Props>(function AmountInputNumber(
  { showAmountWords = true, wordSystem, wordsMin = 0, value, className, ...rest },
  ref,
) {
  const numericValue = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  const words = showAmountWords && Number.isFinite(numericValue) && numericValue > wordsMin
    ? formatAmountInWords(numericValue, wordSystem)
    : '';

  return (
    <div className="w-full">
      <InputNumber ref={ref} value={value} className={className ?? '!w-full'} {...rest} />
      {words ? (
        <div className="mt-1 text-[0.6875rem] leading-snug text-folio-ink/55 dark:text-white/45">
          {words}
        </div>
      ) : null}
    </div>
  );
});

export default AmountInputNumber;
