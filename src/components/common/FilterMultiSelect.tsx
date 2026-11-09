import type { ReactNode } from 'react';
import { Checkbox, Select, Tooltip } from 'antd';
import type { DefaultOptionType, SelectProps } from 'antd/es/select';
import { multiselectSuffixIcon } from './selectIcons';

type FilterOption = Omit<DefaultOptionType, 'children'> & { children?: ReactNode };

type FilterMultiSelectProps = Omit<SelectProps<string[], FilterOption>, 'mode' | 'options'> & {
  className?: string;
  options?: FilterOption[];
  children?: ReactNode;
};

/**
 * Consistent multiselect for table filters: stable sizing (no shrink on selection),
 * responsive tags, and standard multiselect icons.
 */
export default function FilterMultiSelect({
  className,
  suffixIcon = multiselectSuffixIcon,
  maxTagCount = 'responsive',
  popupMatchSelectWidth = false,
  optionRender,
  value,
  popupClassName,
  maxTagPlaceholder,
  ...props
}: FilterMultiSelectProps) {
  return (
    <Select<string[], FilterOption>
      mode="multiple"
      allowClear
      maxTagCount={maxTagCount}
      maxTagPlaceholder={
        maxTagPlaceholder ??
        ((omittedValues) => (
          <Tooltip title={omittedValues.map((v) => v.label).join(', ')}>
            <span>+{omittedValues.length}</span>
          </Tooltip>
        ))
      }
      suffixIcon={suffixIcon}
      popupMatchSelectWidth={popupMatchSelectWidth}
      value={value}
      popupClassName={`folio-multiselect-dropdown ${popupClassName ?? ''}`}
      menuItemSelectedIcon={null}
      optionRender={
        optionRender ??
        ((option) => {
          const selected = Array.isArray(value) && value.includes(option.value as string);
          const label = (option.data?.label ?? option.label ?? option.value) as ReactNode;
          return (
            <span className="inline-flex w-full items-center gap-2">
              <Checkbox checked={selected} tabIndex={-1} />
              <span className="min-w-0 flex-1">{label}</span>
            </span>
          );
        })
      }
      className={`w-full min-w-0 ${className ?? ''}`}
      {...props}
    />
  );
}

