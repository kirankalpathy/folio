import type { ReactNode } from 'react';
import type { BackupReport } from '../../types';
import type { MessageKey } from '../../i18n';

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;
export interface BackupDialogModal {
  info: (config: { title: string; content: ReactNode; okText?: string; centered?: boolean; width?: number; icon?: ReactNode | null }) => void;
  error: (config: { title: string; content: ReactNode; okText?: string; centered?: boolean; width?: number }) => void;
}

function ReportTable({ report, t }: { report: BackupReport; t: Translate }) {
  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-folio-ink/10 text-left text-folio-ink/60 dark:border-white/10 dark:text-white/55">
            <th className="py-2 pr-3 font-medium">{t('backup.report.item')}</th>
            <th className="py-2 pr-3 text-right font-medium">{t('backup.report.success')}</th>
            <th className="py-2 text-right font-medium">{t('backup.report.errors')}</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r, i) => (
            <tr key={`${r.itemLabelKey}-${i}`} className="border-b border-folio-ink/[0.06] last:border-b-0 dark:border-white/[0.06]">
              <td className={`py-2 pr-3 ${r.indent ? 'pl-5 text-folio-ink/80 dark:text-white/75' : 'font-medium text-folio-ink dark:text-white/90'}`}>
                {r.indent ? <span className="mr-1.5 text-folio-ink/35 dark:text-white/30">↳</span> : null}
                {r.itemLabel ?? t(r.itemLabelKey as MessageKey, r.itemLabelParams)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-folio-ink dark:text-white/90">{r.success}</td>
              <td className={`py-2 text-right tabular-nums ${r.errors > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-folio-ink/70 dark:text-white/60'}`}>{r.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function showBackupReportDialog(
  modal: BackupDialogModal,
  t: Translate,
  report: BackupReport,
): void {
  modal.info({
    title: t(report.kind === 'export' ? 'backup.report.exportTitle' : 'backup.report.restoreTitle'),
    content: <ReportTable report={report} t={t} />,
    okText: t('backup.report.ok'),
    centered: true,
    width: 520,
    icon: null,
  });
}

export function showBackupErrorDialog(modal: BackupDialogModal, t: Translate, message: string): void {
  modal.error({
    title: t('settings.backup.title'),
    content: <div className="whitespace-pre-wrap text-[13px] text-folio-ink/80 dark:text-white/75">{message}</div>,
    okText: t('backup.report.ok'),
    centered: true,
    width: 520,
  });
}
