import type { ReactNode } from 'react';
import { Select } from 'antd';
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
  ...props
}: FilterMultiSelectProps) {
  return (
    <Select<string[], FilterOption>
      mode="multiple"
      allowClear
      maxTagCount={maxTagCount}
      suffixIcon={suffixIcon}
      className={`w-full min-w-[12rem] shrink-0 sm:w-[14rem] ${className ?? ''}`}
      {...props}
    />
  );
}

