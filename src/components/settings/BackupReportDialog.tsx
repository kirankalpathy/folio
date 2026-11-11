import { Fragment, useState, type ReactNode } from 'react';
import type { BackupReport } from '../../types';
import type { MessageKey } from '../../i18n';

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;
export interface BackupDialogModal {
  info: (config: { title: string; content: ReactNode; okText?: string; centered?: boolean; width?: number; icon?: ReactNode | null }) => void;
  error: (config: { title: string; content: ReactNode; okText?: string; centered?: boolean; width?: number }) => void;
}

export function ReportTable({ report, t, mode = 'result' }: { report: BackupReport; t: Translate; mode?: 'preview' | 'result' }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isResult = mode === 'result';
  const colSpan = isResult ? 4 : 2;

  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full border-collapse text-[0.8125rem]">
        <thead>
          <tr className="border-b border-folio-ink/10 text-left text-folio-ink/60 dark:border-white/10 dark:text-white/55">
            <th className="py-2 pr-3 font-medium">{t('backup.report.item')}</th>
            <th className="py-2 pr-3 text-right font-medium">{t('backup.report.recordCount')}</th>
            {isResult ? (
              <>
                <th className="py-2 pr-3 text-right font-medium">{t('backup.report.success')}</th>
                <th className="py-2 text-right font-medium">{t('backup.report.errors')}</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r, i) => {
            const rowKey = `${r.itemLabelKey}-${i}`;
            const total = r.success + r.errors;
            const hasDetails = isResult && r.errors > 0 && r.errorCategories && Object.keys(r.errorCategories).length > 0;
            const isExpanded = expanded === rowKey;
            return (
              <Fragment key={rowKey}>
                <tr className="border-b border-folio-ink/[0.06] last:border-b-0 dark:border-white/[0.06]">
                  <td className={`py-2 pr-3 ${r.indent ? 'pl-5 text-folio-ink/80 dark:text-white/75' : 'font-medium text-folio-ink dark:text-white/90'}`}>
                    {r.indent ? <span className="mr-1.5 text-folio-ink/35 dark:text-white/30">↳</span> : null}
                    {r.itemLabel ?? t(r.itemLabelKey as MessageKey, r.itemLabelParams)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-folio-ink dark:text-white/90">{isResult ? total : r.success}</td>
                  {isResult ? (
                    <>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">{r.success}</td>
                      <td className="py-2 text-right tabular-nums">
                        {hasDetails ? (
                          <button
                            type="button"
                            className="font-medium text-red-600 underline decoration-red-600/40 underline-offset-2 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => setExpanded(isExpanded ? null : rowKey)}
                          >
                            {r.errors}
                          </button>
                        ) : (
                          <span className={r.errors > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-red-600/70 dark:text-red-400/70'}>{r.errors}</span>
                        )}
                      </td>
                    </>
                  ) : null}
                </tr>
                {isExpanded && hasDetails ? (
                  <tr className="border-b border-folio-ink/[0.06] last:border-b-0 dark:border-white/[0.06]">
                    <td colSpan={colSpan} className="pb-3 pt-1">
                      <div className="rounded-md bg-folio-ink/[0.03] p-2 dark:bg-white/[0.04]">
                        <table className="w-full border-collapse text-[0.75rem]">
                          <thead>
                            <tr className="text-left text-folio-ink/55 dark:text-white/50">
                              <th className="py-1 pr-3 font-medium">{t('backup.error.errorType')}</th>
                              <th className="py-1 text-right font-medium">{t('backup.error.count')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(r.errorCategories ?? {}).map(([cat, count]) => (
                              <tr key={cat}>
                                <td className="py-1 pr-3 text-folio-ink/85 dark:text-white/85">{cat}</td>
                                <td className="py-1 text-right tabular-nums text-red-600 dark:text-red-400">{count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
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
    content: <div className="whitespace-pre-wrap text-[0.8125rem] text-folio-ink/80 dark:text-white/75">{message}</div>,
    okText: t('backup.report.ok'),
    centered: true,
    width: 520,
  });
}
