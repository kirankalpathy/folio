import { useState } from 'react';
import { App as AntApp, Button, Dropdown } from 'antd';
import { Download, FileSpreadsheet, FileText, Table2 } from 'lucide-react';
import { useBusyIndicator } from './BusyIndicator';
import { useI18n } from '../../i18n';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export default function ExportDropdown({
  label,
  labels,
  onExport,
  disabled,
  loading,
  menuClassName,
  hasFilters,
}: {
  label: string;
  labels: { excel: string; csv: string; pdf: string };
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  menuClassName?: string;
  /** When true, confirms before export that only filtered data will be exported. */
  hasFilters?: boolean;
}) {
  const { modal } = AntApp.useApp();
  const { setBusyIndicator } = useBusyIndicator();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const isLoading = loading ?? busy;

  const runExport = async (format: ExportFormat) => {
    setBusy(true);
    setBusyIndicator();
    try {
      await Promise.resolve(onExport(format));
    } finally {
      setBusy(false);
      setBusyIndicator(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (hasFilters) {
      modal.confirm({
        title: t('common.export.filteredConfirm.title'),
        content: t('common.export.filteredConfirm.content'),
        okText: t('common.export.filteredConfirm.ok'),
        cancelText: t('common.export.filteredConfirm.cancel'),
        onOk: () => runExport(format),
      });
      return;
    }
    void runExport(format);
  };

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'xlsx', label: labels.excel, icon: <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> },
          { key: 'csv', label: labels.csv, icon: <Table2 size={14} className="text-sky-600 dark:text-sky-400" /> },
          { key: 'pdf', label: labels.pdf, icon: <FileText size={14} className="text-rose-600 dark:text-rose-400" /> },
        ],
        onClick: ({ key }) => handleExport(key as ExportFormat),
        className: menuClassName,
      }}
      trigger={['click']}
      disabled={disabled || isLoading}
    >
      <Button icon={<Download size={15} />} loading={isLoading}>{label}</Button>
    </Dropdown>
  );
}
