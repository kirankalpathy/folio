import { Button, Dropdown } from 'antd';
import { Download, FileSpreadsheet, FileText, Table2 } from 'lucide-react';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export default function ExportDropdown({
  label,
  labels,
  onExport,
  disabled,
  loading,
  menuClassName,
}: {
  label: string;
  labels: { excel: string; csv: string; pdf: string };
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
  menuClassName?: string;
}) {
  return (
    <Dropdown
      menu={{
        items: [
          { key: 'xlsx', label: labels.excel, icon: <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> },
          { key: 'csv', label: labels.csv, icon: <Table2 size={14} className="text-sky-600 dark:text-sky-400" /> },
          { key: 'pdf', label: labels.pdf, icon: <FileText size={14} className="text-rose-600 dark:text-rose-400" /> },
        ],
        onClick: ({ key }) => void onExport(key as ExportFormat),
        className: menuClassName,
      }}
      trigger={['click']}
      disabled={disabled}
    >
      <Button icon={<Download size={15} />} loading={loading} className="sm:ml-auto">{label}</Button>
    </Dropdown>
  );
}
